"""
Pipeline orchestrator — the central coordinator that ties every component together.

Manages the full end-to-end flow:
    scan → navigate → capture → transcribe → OCR → generate → export

Handles checkpoint/resume, error recovery, progress tracking, and retries.
"""

from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeRemainingColumn,
)

from notes_ai.ai.note_generator import NoteGenerator
from notes_ai.audio.capture import AudioCapture
from notes_ai.audio.processor import AudioProcessor
from notes_ai.audio.transcriber import Transcriber
from notes_ai.browser.course_scanner import CourseScanner
from notes_ai.browser.lecture_navigator import LectureNavigator
from notes_ai.browser.session import BrowserSession
from notes_ai.core.config import AppConfig
from notes_ai.core.database import Database
from notes_ai.core.models import (
    CaptureMethod,
    CodeBlock,
    Course,
    Lecture,
    LectureMetadata,
    LectureOutput,
    ProcessingStatus,
    Transcript,
)
from notes_ai.export.markdown_writer import MarkdownWriter
from notes_ai.export.pdf_writer import PDFWriter
from notes_ai.utils.helpers import Timer, ensure_dir, slugify
from notes_ai.utils.logging import console, get_logger

logger = get_logger("core.orchestrator")


class Orchestrator:
    """
    Central pipeline coordinator.

    Drives the complete lecture-to-notes pipeline with progress tracking,
    checkpoint/resume, error handling, and retry logic.
    """

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self._db = Database(config.output_path / ".notes_ai.db")

        # Components (initialized lazily)
        self._audio_capture = AudioCapture(config)
        self._audio_processor = AudioProcessor(config)
        self._transcriber = Transcriber(config)
        self._note_generator = NoteGenerator(config)
        self._markdown_writer = MarkdownWriter()
        self._pdf_writer = PDFWriter(config)

    async def process_course(
        self,
        course_url: str,
        single_lecture: Optional[int] = None,
        skip_completed: bool = False,
        start_from: Optional[int] = None,
        start_section: Optional[int] = None,
    ) -> None:
        """
        Process a course: scan, iterate lectures, generate notes.

        Args:
            course_url: Udemy course URL.
            single_lecture: Process only this lecture index (1-based).
            skip_completed: Skip lectures marked completed on Udemy.
            start_from: Start from this lecture index.
        """
        async with BrowserSession(self.config) as session:
            # Check login
            if not await session.is_logged_in():
                logger.error(
                    "Not logged in. Run 'notes-ai login' first."
                )
                return

            # Scan course
            scanner = CourseScanner(session)
            course = await scanner.scan_course(course_url)

            # Save course to database
            self._db.save_course(
                url=course.url,
                title=course.title,
                instructor=course.instructor,
                total_lectures=course.total_lectures,
                total_duration=course.total_duration_seconds,
                data_json=course.model_dump_json(),
            )

            # Determine which lectures to process
            lectures = self._select_lectures(
                course, single_lecture, skip_completed, start_from, start_section
            )

            if not lectures:
                logger.info("No lectures to process!")
                return

            logger.info(
                "Processing %d lectures from '%s'",
                len(lectures), course.title,
            )

            # Create navigator
            navigator = LectureNavigator(session, self.config)

            # Process with progress bar
            completed = 0
            failed = 0

            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(bar_width=30),
                MofNCompleteColumn(),
                TimeRemainingColumn(),
                console=console,
            ) as progress:
                task = progress.add_task(
                    f"[cyan]Processing {course.title}",
                    total=len(lectures),
                )

                for lecture in lectures:
                    progress.update(
                        task,
                        description=f"[cyan]#{lecture.index}: {lecture.title[:40]}...",
                    )

                    # Check if already completed
                    status = self._db.get_lecture_status(course_url, lecture.index)
                    if status == ProcessingStatus.COMPLETED.value:
                        logger.info("Skipping completed lecture #%d", lecture.index)
                        progress.advance(task)
                        completed += 1
                        continue

                    # Process single lecture
                    try:
                        await self._process_lecture(
                            lecture, course, navigator, session
                        )
                        completed += 1
                    except Exception as e:
                        failed += 1
                        logger.error(
                            "Failed to process lecture #%d '%s': %s",
                            lecture.index, lecture.title, e,
                        )
                        self._db.update_lecture_status(
                            course_url,
                            lecture.index,
                            ProcessingStatus.FAILED,
                            error_message=str(e),
                        )

                    progress.advance(task)

                    # Update checkpoint
                    self._db.update_progress(
                        course_url, lecture.index, completed, failed,
                    )

        logger.info(
            "Course processing complete: %d completed, %d failed",
            completed, failed,
        )

    async def _process_lecture(
        self,
        lecture: Lecture,
        course: Course,
        navigator: LectureNavigator,
        session: BrowserSession,
    ) -> LectureOutput:
        """
        Process a single lecture through the entire pipeline.

        Steps:
            1. Navigate to lecture
            2. Capture screenshots during playback
            3. Extract captions/audio
            4. Run slide detection
            5. Run OCR
            6. Detect code
            7. Transcribe (if audio)
            8. Generate notes via LLM
            9. Export to Markdown and PDF
        """
        with Timer() as timer:
            logger.info("=" * 60)
            section_context = f"[{lecture.section_title}] " if lecture.section_title else ""
            logger.info("Processing %sLecture #%d: %s", section_context, lecture.index, lecture.title)
            logger.info("=" * 60)

            # Update status
            self._db.update_lecture_status(
                course.url, lecture.index, ProcessingStatus.CAPTURING,
            )

            # Create output directory
            course_slug = slugify(course.title)
            lecture_slug = f"lecture_{lecture.index:02d}_{slugify(lecture.title, 50)}"
            output_dir = ensure_dir(self.config.output_path / course_slug / lecture_slug)
            screenshots_dir = ensure_dir(output_dir / "screenshots")

            # --- Step 1: Navigate to lecture ---
            page = await navigator.open_lecture(lecture, course.url)

            # --- Step 2: Capture screenshots during playback ---
            logger.info("Capturing screenshots...")
            await navigator.play_video(page)
            screenshot_paths = await navigator.capture_screenshots_during_playback(
                page,
                output_dir=screenshots_dir,
                interval_seconds=self.config.visual.screenshot_interval_seconds,
                max_screenshots=self.config.visual.max_screenshots_per_lecture,
            )
            await navigator.pause_video(page)

            # --- Step 3: Extract captions ---
            logger.info("Extracting captions...")
            self._db.update_lecture_status(
                course.url, lecture.index, ProcessingStatus.TRANSCRIBING,
            )

            transcript: Optional[Transcript] = None

            if self.config.audio.capture_method == CaptureMethod.CAPTIONS:
                caption_data = await navigator.extract_captions(page)
                if caption_data:
                    transcript = await self._audio_capture.capture_from_captions(caption_data)
            else:
                # Loopback audio capture
                duration = await navigator.get_video_duration(page)
                if duration > 0:
                    audio_path = output_dir / "raw_audio.wav"
                    recorded = await self._audio_capture.capture_loopback_audio(
                        audio_path, duration
                    )
                    if recorded:
                        chunks = self._audio_processor.process(recorded, output_dir / "audio_chunks")
                        transcript = self._transcriber.transcribe_chunks(chunks)

            # --- Step 4: Slide detection ---
            logger.info("Detecting slides...")
            self._db.update_lecture_status(
                course.url, lecture.index, ProcessingStatus.OCR_PROCESSING,
            )

            from notes_ai.visual.frame_extractor import FrameExtractor
            from notes_ai.visual.slide_detector import SlideDetector
            from notes_ai.visual.ocr_engine import OCREngine
            from notes_ai.visual.code_detector import CodeDetector

            frame_extractor = FrameExtractor(self.config)
            slide_detector = SlideDetector(self.config)
            ocr_engine = OCREngine(self.config)
            code_detector = CodeDetector(self.config)

            # Extract frames from screenshots
            frames = frame_extractor.extract_frames_from_screenshots(screenshot_paths)

            # Detect unique slides
            unique_slides = slide_detector.detect_unique_slides(frames)
            unique_slides = slide_detector.deduplicate_slides(unique_slides)

            # --- Step 5: OCR ---
            logger.info("Running OCR on %d unique slides...", len(unique_slides))
            unique_slides = ocr_engine.process_slides(unique_slides)

            # --- Step 6: Code detection ---
            logger.info("Detecting code blocks...")
            code_blocks = code_detector.extract_code_blocks(unique_slides)

            # Clean code text
            for block in code_blocks:
                block.code = code_detector.clean_code_text(block.code)

            # --- Step 7: Generate AI notes ---
            logger.info("Generating AI notes...")
            self._db.update_lecture_status(
                course.url, lecture.index, ProcessingStatus.GENERATING_NOTES,
            )

            notes = self._note_generator.generate_notes(
                lecture_title=lecture.title,
                transcript=transcript,
                code_blocks=code_blocks,
                slides=unique_slides,
            )

            # --- Step 8: Export ---
            logger.info("Exporting notes...")
            self._db.update_lecture_status(
                course.url, lecture.index, ProcessingStatus.EXPORTING,
            )

            # Markdown
            md_paths = self._markdown_writer.write_all(
                output_dir=output_dir,
                notes=notes,
                transcript=transcript,
                code_blocks=code_blocks,
            )

            # PDF
            if "pdf" in self.config.export.formats:
                notes_md = md_paths.get("notes")
                if notes_md:
                    self._pdf_writer.convert_markdown_to_pdf(
                        notes_md,
                        output_dir / "notes.pdf",
                        title=lecture.title,
                    )

            # --- Step 9: Save metadata ---
            metadata = LectureMetadata(
                lecture_title=lecture.title,
                lecture_index=lecture.index,
                section_title=lecture.section_title,
                duration_seconds=lecture.duration_seconds,
                processing_time_seconds=timer.elapsed,
                num_screenshots=len(unique_slides),
                num_code_blocks=len(code_blocks),
                num_concepts=len(notes.key_concepts),
                word_count=len(notes.detailed_explanation.split()),
                transcript_confidence=(
                    transcript.average_confidence if transcript else 0.0
                ),
                status=ProcessingStatus.COMPLETED,
                processed_at=datetime.now(timezone.utc),
            )

            # Write metadata.json
            metadata_path = output_dir / "metadata.json"
            metadata_path.write_text(
                metadata.model_dump_json(indent=2),
                encoding="utf-8",
            )

            # Update database
            self._db.update_lecture_status(
                course.url,
                lecture.index,
                ProcessingStatus.COMPLETED,
                metadata=metadata,
            )

            # --- Step 10: Clean up ---
            import shutil
            if screenshots_dir.exists():
                logger.info("Cleaning up screenshots to save space...")
                try:
                    shutil.rmtree(screenshots_dir)
                except Exception as e:
                    logger.warning("Failed to clean up screenshots: %s", e)

        logger.info(
            "✓ Lecture #%d complete in %.1fs — %d slides, %d code blocks, %d concepts",
            lecture.index,
            timer.elapsed,
            len(unique_slides),
            len(code_blocks),
            len(notes.key_concepts),
        )

        return LectureOutput(
            lecture=lecture,
            transcript=transcript,
            slides=unique_slides,
            code_blocks=code_blocks,
            metadata=metadata,
            output_dir=output_dir,
        )

    async def export_course(self, course_url: str, format: str = "both") -> None:
        """
        Re-export notes for all completed lectures.

        Args:
            course_url: Course URL.
            format: Export format ("markdown", "pdf", or "both").
        """
        lectures = self._db.get_all_lectures(course_url)
        completed = [l for l in lectures if l["status"] == "completed"]

        if not completed:
            logger.warning("No completed lectures found for export.")
            return

        course = self._db.get_course(course_url)
        course_slug = slugify(course["title"]) if course else "unknown_course"

        for lec in completed:
            lecture_slug = f"lecture_{lec['lecture_index']:02d}_{slugify(lec['title'], 50)}"
            output_dir = self.config.output_path / course_slug / lecture_slug
            notes_md = output_dir / "notes.md"

            if not notes_md.exists():
                continue

            if format in ("pdf", "both"):
                self._pdf_writer.convert_markdown_to_pdf(
                    notes_md,
                    output_dir / "notes.pdf",
                    title=lec["title"],
                )

        logger.info("Export complete for %d lectures", len(completed))

    def _select_lectures(
        self,
        course: Course,
        single_lecture: Optional[int],
        skip_completed: bool,
        start_from: Optional[int],
        start_section: Optional[int] = None,
    ) -> list[Lecture]:
        """Select which lectures to process based on filters."""
        if start_section is not None:
            for section in course.sections:
                if section.index == start_section:
                    if section.lectures:
                        start_from = section.lectures[0].index
                    break

        lectures = course.video_lectures

        if single_lecture is not None:
            return [l for l in lectures if l.index == single_lecture]

        if skip_completed:
            lectures = [l for l in lectures if not l.is_completed]

        if start_from is not None:
            lectures = [l for l in lectures if l.index >= start_from]

        # Save all lectures to DB
        for lecture in course.all_lectures:
            self._db.save_lecture(
                course_url=course.url,
                lecture_index=lecture.index,
                title=lecture.title,
                section_title=lecture.section_title,
                duration=lecture.duration_seconds,
                content_type=lecture.content_type,
            )

        return lectures
