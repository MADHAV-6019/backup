"""
Markdown writer — generates structured Markdown files from LectureNotes.

Produces: notes.md, transcript.md, flashcards.md, quiz.md
"""

from __future__ import annotations

from pathlib import Path

from notes_ai.ai.schemas import LectureNotes
from notes_ai.core.models import CodeBlock, Transcript
from notes_ai.utils.helpers import ensure_dir, format_timestamp
from notes_ai.utils.logging import get_logger

logger = get_logger("export.markdown_writer")


class MarkdownWriter:
    """Generates all Markdown output files from processed lecture data."""

    def write_all(
        self,
        output_dir: Path,
        notes: LectureNotes,
        transcript: Transcript | None = None,
        code_blocks: list[CodeBlock] | None = None,
    ) -> dict[str, Path]:
        """
        Write all Markdown files for a lecture.

        Args:
            output_dir: Directory to write files into.
            notes: Generated lecture notes.
            transcript: Lecture transcript (optional).
            code_blocks: Detected code blocks (optional).

        Returns:
            Dict mapping file type to path: ``{"notes": Path, "transcript": Path, ...}``
        """
        ensure_dir(output_dir)
        paths: dict[str, Path] = {}

        # Main notes
        notes_path = output_dir / "notes.md"
        self._write_notes(notes_path, notes)
        paths["notes"] = notes_path

        # Transcript
        if transcript and transcript.segments:
            transcript_path = output_dir / "transcript.md"
            self._write_transcript(transcript_path, transcript, notes.lecture_title)
            paths["transcript"] = transcript_path

        # Flashcards
        if getattr(notes, 'flashcards', None):
            flashcards_path = output_dir / "flashcards.md"
            self._write_flashcards(flashcards_path, notes)
            paths["flashcards"] = flashcards_path

        # Quiz
        if getattr(notes, 'quiz', None):
            quiz_path = output_dir / "quiz.md"
            self._write_quiz(quiz_path, notes)
            paths["quiz"] = quiz_path

        # Code files
        if code_blocks:
            code_dir = ensure_dir(output_dir / "code")
            for i, block in enumerate(code_blocks, 1):
                ext = self._language_extension(block.language)
                code_path = code_dir / f"snippet_{i:02d}{ext}"
                code_path.write_text(block.code, encoding="utf-8")
            paths["code_dir"] = code_dir

        logger.info("Wrote %d Markdown files to %s", len(paths), output_dir)
        return paths

    # ------------------------------------------------------------------
    # Notes
    # ------------------------------------------------------------------

    def _write_notes(self, path: Path, notes: LectureNotes) -> None:
        """Write the main notes.md file."""
        lines: list[str] = []

        lines.append(f"# {notes.lecture_title}\n")

        # Overview
        lines.append("## 📋 Overview\n")
        lines.append(notes.overview + "\n")

        # Key Concepts
        if getattr(notes, 'key_concepts', None):
            lines.append("## 🔑 Key Concepts\n")
            for concept in notes.key_concepts:
                importance_badge = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(
                    concept.importance, "🟡"
                )
                lines.append(f"### {importance_badge} {concept.name}\n")
                lines.append(concept.explanation + "\n")

        # Definitions
        if getattr(notes, 'definitions', None):
            lines.append("## 📖 Definitions\n")
            for defn in notes.definitions:
                lines.append(f"**{defn.term}**: {defn.definition}\n")
                if defn.example:
                    lines.append(f"> *Example:* {defn.example}\n")

        # Detailed Explanation
        lines.append("## 📝 Detailed Explanation\n")
        lines.append(notes.detailed_explanation + "\n")


        # Code Examples
        if getattr(notes, 'code_examples', None):
            lines.append("## 💻 Code Examples\n")
            for example in notes.code_examples:
                lines.append(f"### {example.title}\n")
                lines.append(f"```{example.language}")
                lines.append(example.code)
                lines.append("```\n")
                lines.append(f"**Explanation:** {example.explanation}\n")
                if example.output:
                    lines.append(f"**Expected Output:**\n```\n{example.output}\n```\n")


        # Summary
        lines.append("## 📌 Summary\n")
        lines.append(notes.summary + "\n")


        # Write file
        path.write_text("\n".join(lines), encoding="utf-8")
        logger.debug("Wrote notes: %s", path)

    # ------------------------------------------------------------------
    # Transcript
    # ------------------------------------------------------------------

    def _write_transcript(
        self, path: Path, transcript: Transcript, title: str
    ) -> None:
        """Write the transcript.md file with timestamps."""
        lines: list[str] = [
            f"# Transcript: {title}\n",
            f"*Language: {transcript.language} | "
            f"Duration: {transcript.duration_seconds:.0f}s | "
            f"Confidence: {transcript.average_confidence:.2f}*\n",
            "---\n",
        ]

        for seg in transcript.segments:
            ts = format_timestamp(seg.start)
            lines.append(f"**{ts}** {seg.text}\n")

        path.write_text("\n".join(lines), encoding="utf-8")
        logger.debug("Wrote transcript: %s", path)

    # ------------------------------------------------------------------
    # Flashcards
    # ------------------------------------------------------------------

    def _write_flashcards(self, path: Path, notes: LectureNotes) -> None:
        """Write the flashcards.md file."""
        lines: list[str] = [
            f"# 🃏 Flashcards: {notes.lecture_title}\n",
            f"*{len(notes.flashcards)} cards for spaced repetition study*\n",
            "---\n",
        ]

        for i, card in enumerate(notes.flashcards, 1):
            lines.append(f"### Card {i}\n")
            lines.append(f"**Front:** {card.front}\n")
            lines.append(f"**Back:** {card.back}\n")
            lines.append("---\n")

        path.write_text("\n".join(lines), encoding="utf-8")
        logger.debug("Wrote flashcards: %s", path)

    # ------------------------------------------------------------------
    # Quiz
    # ------------------------------------------------------------------

    def _write_quiz(self, path: Path, notes: LectureNotes) -> None:
        """Write the quiz.md file."""
        lines: list[str] = [
            f"# 📝 Quiz: {notes.lecture_title}\n",
            f"*{len(notes.quiz)} questions — Test your understanding!*\n",
            "---\n",
        ]

        for i, q in enumerate(notes.quiz, 1):
            lines.append(f"### Question {i}\n")
            lines.append(f"{q.question}\n")
            for opt in q.options:
                lines.append(f"- {opt}")
            lines.append("")
            lines.append(f"<details><summary>Answer</summary>\n")
            lines.append(f"**{q.correct_answer}**\n")
            lines.append(f"{q.explanation}")
            lines.append(f"</details>\n")
            lines.append("---\n")

        path.write_text("\n".join(lines), encoding="utf-8")
        logger.debug("Wrote quiz: %s", path)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _language_extension(language: str) -> str:
        """Map a programming language name to a file extension."""
        ext_map = {
            "python": ".py",
            "javascript": ".js",
            "typescript": ".ts",
            "java": ".java",
            "cpp": ".cpp",
            "c": ".c",
            "csharp": ".cs",
            "go": ".go",
            "rust": ".rs",
            "ruby": ".rb",
            "sql": ".sql",
            "html": ".html",
            "css": ".css",
            "bash": ".sh",
            "r": ".r",
            "text": ".txt",
        }
        return ext_map.get(language.lower(), ".txt")
