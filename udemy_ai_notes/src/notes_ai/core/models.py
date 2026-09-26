"""
Pydantic domain models for the Udemy AI Notes pipeline.

Every data structure flowing through the pipeline is defined here as a
validated Pydantic model, ensuring type safety and clean serialization.
"""

from __future__ import annotations

import enum
from datetime import datetime
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ProcessingStatus(str, enum.Enum):
    """Status of a lecture's processing lifecycle."""
    PENDING = "pending"
    SCANNING = "scanning"
    CAPTURING = "capturing"
    TRANSCRIBING = "transcribing"
    OCR_PROCESSING = "ocr_processing"
    GENERATING_NOTES = "generating_notes"
    EXPORTING = "exporting"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class CaptureMethod(str, enum.Enum):
    """How audio content is obtained from lectures."""
    CAPTIONS = "captions"
    LOOPBACK = "loopback"


class LLMProvider(str, enum.Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    GOOGLE = "google"
    ANTHROPIC = "anthropic"
    GROQ = "groq"


class OCREngine(str, enum.Enum):
    """Supported OCR engines."""
    EASYOCR = "easyocr"
    TESSERACT = "tesseract"


# ---------------------------------------------------------------------------
# Transcript Models
# ---------------------------------------------------------------------------

class TranscriptSegment(BaseModel):
    """A single timed segment of transcribed speech."""
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    text: str = Field(..., description="Transcribed text content")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Transcription confidence")
    speaker: Optional[str] = Field(default=None, description="Speaker label if diarized")


class Transcript(BaseModel):
    """Complete transcript for a lecture."""
    segments: list[TranscriptSegment] = Field(default_factory=list)
    language: str = Field(default="en")
    language_probability: float = Field(default=0.0)
    duration_seconds: float = Field(default=0.0)

    @property
    def full_text(self) -> str:
        """Concatenate all segments into a single string."""
        return " ".join(seg.text.strip() for seg in self.segments if seg.text.strip())

    @property
    def average_confidence(self) -> float:
        """Mean confidence across all segments."""
        if not self.segments:
            return 0.0
        return sum(s.confidence for s in self.segments) / len(self.segments)


# ---------------------------------------------------------------------------
# Visual / OCR Models
# ---------------------------------------------------------------------------

class BoundingBox(BaseModel):
    """Bounding box for a detected text region."""
    x: int
    y: int
    width: int
    height: int


class OCRResult(BaseModel):
    """A single OCR detection from a frame."""
    text: str
    confidence: float = Field(ge=0.0, le=1.0)
    bounding_box: Optional[BoundingBox] = None
    region_type: str = Field(
        default="body",
        description="Classification: heading, body, code, formula, label",
    )


class SlideFrame(BaseModel):
    """A unique slide/frame captured from the video."""
    frame_index: int = Field(..., description="Frame number in the video")
    timestamp_seconds: float = Field(..., description="Time position in video")
    image_path: Optional[Path] = Field(default=None, description="Path to saved screenshot")
    similarity_score: float = Field(
        default=0.0,
        description="SSIM score vs. previous frame (lower = more different)",
    )
    ocr_results: list[OCRResult] = Field(default_factory=list)
    is_code_slide: bool = Field(default=False, description="Whether slide primarily contains code")


class CodeBlock(BaseModel):
    """A detected code snippet from visual analysis."""
    code: str = Field(..., description="Raw code text — never summarized")
    language: str = Field(default="text", description="Detected programming language")
    source_frame_index: int = Field(default=0, description="Frame where code was detected")
    timestamp_seconds: float = Field(default=0.0)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Course Structure Models
# ---------------------------------------------------------------------------

class Lecture(BaseModel):
    """A single lecture within a course."""
    index: int = Field(..., description="1-based position in the course")
    title: str
    url: Optional[str] = None
    duration_seconds: float = Field(default=0.0)
    section_title: Optional[str] = None
    is_completed: bool = Field(default=False, description="Marked complete on Udemy")
    content_type: str = Field(default="video", description="video, article, quiz, etc.")


class CourseSection(BaseModel):
    """A section (chapter) within a course."""
    title: str
    index: int
    lectures: list[Lecture] = Field(default_factory=list)


class Course(BaseModel):
    """A full Udemy course with its curriculum."""
    title: str
    url: str
    instructor: Optional[str] = None
    total_lectures: int = Field(default=0)
    total_duration_seconds: float = Field(default=0.0)
    sections: list[CourseSection] = Field(default_factory=list)
    scanned_at: Optional[datetime] = None

    @property
    def all_lectures(self) -> list[Lecture]:
        """Flatten all lectures across sections."""
        lectures: list[Lecture] = []
        for section in self.sections:
            lectures.extend(section.lectures)
        return lectures

    @property
    def video_lectures(self) -> list[Lecture]:
        """Only video-type lectures."""
        return [l for l in self.all_lectures if l.content_type == "video"]


# ---------------------------------------------------------------------------
# Metadata & Output Models
# ---------------------------------------------------------------------------

class LectureMetadata(BaseModel):
    """Metadata written to metadata.json for each processed lecture."""
    lecture_title: str
    lecture_index: int
    section_title: Optional[str] = None
    duration_seconds: float = Field(default=0.0)
    processing_time_seconds: float = Field(default=0.0)
    num_screenshots: int = Field(default=0)
    num_code_blocks: int = Field(default=0)
    num_concepts: int = Field(default=0)
    word_count: int = Field(default=0)
    transcript_confidence: float = Field(default=0.0)
    status: ProcessingStatus = ProcessingStatus.PENDING
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class LectureOutput(BaseModel):
    """Aggregated output from processing a single lecture."""
    lecture: Lecture
    transcript: Optional[Transcript] = None
    slides: list[SlideFrame] = Field(default_factory=list)
    code_blocks: list[CodeBlock] = Field(default_factory=list)
    metadata: Optional[LectureMetadata] = None
    output_dir: Optional[Path] = None


# ---------------------------------------------------------------------------
# Processing Progress
# ---------------------------------------------------------------------------

class CourseProgress(BaseModel):
    """Overall processing progress for a course."""
    course_title: str
    course_url: str
    total_lectures: int = 0
    completed_lectures: int = 0
    failed_lectures: int = 0
    pending_lectures: int = 0
    last_processed_index: int = 0
    started_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @property
    def progress_percent(self) -> float:
        """Percentage of lectures completed."""
        if self.total_lectures == 0:
            return 0.0
        return (self.completed_lectures / self.total_lectures) * 100
