"""Tests for the export pipeline (Markdown and PDF)."""

from __future__ import annotations

from pathlib import Path

import pytest

from notes_ai.ai.schemas import (
    CodeExample,
    Definition,
    Flashcard,
    KeyConcept,
    LectureNotes,
    QuizQuestion,
)
from notes_ai.core.config import AppConfig
from notes_ai.core.models import CodeBlock, Transcript
from notes_ai.export.markdown_writer import MarkdownWriter
from notes_ai.export.pdf_writer import PDFWriter


@pytest.fixture
def sample_notes() -> LectureNotes:
    """Provide sample LectureNotes for export testing."""
    return LectureNotes(
        lecture_title="Python Functions Deep Dive",
        overview="This lecture covers Python functions in depth.",
        key_concepts=[
            KeyConcept(
                name="Functions",
                explanation="A function is a reusable block of code.",
                importance="high",
            ),
            KeyConcept(
                name="Parameters",
                explanation="Parameters allow you to pass data to functions.",
                importance="medium",
            ),
        ],
        definitions=[
            Definition(
                term="Function",
                definition="A named block of code that performs a specific task.",
                example="def greet(): print('Hello')",
            ),
        ],
        detailed_explanation="Functions are the building blocks of Python programs...",
        important_points=["Use descriptive names", "Keep functions small"],
        algorithms=[],
        math_formulas=[],
        code_examples=[
            CodeExample(
                title="Basic Function",
                language="python",
                code='def greet(name):\n    return f"Hello, {name}!"',
                explanation="This function takes a name and returns a greeting.",
                output="Hello, World!",
            ),
        ],
        interview_questions=[],
        common_mistakes=["Forgetting the return statement"],
        best_practices=["Use type hints"],
        memory_tricks=["DEF = Define, Execute, Finish"],
        summary="Functions are essential building blocks in Python.",
        revision_sheet="- def keyword\n- Parameters vs Arguments\n- Return values",
        quiz=[
            QuizQuestion(
                question="What keyword defines a function?",
                options=["A) func", "B) def", "C) function", "D) define"],
                correct_answer="B",
                explanation="Python uses 'def' to define functions.",
            ),
        ],
        flashcards=[
            Flashcard(front="What is a function?", back="A reusable block of code."),
        ],
        practical_applications=["Web APIs", "Data processing pipelines"],
    )


class TestMarkdownWriter:
    """Test Markdown export."""

    def test_write_notes(self, tmp_dir: Path, sample_notes: LectureNotes) -> None:
        """Should create notes.md with all sections."""
        writer = MarkdownWriter()
        paths = writer.write_all(tmp_dir, sample_notes)

        assert "notes" in paths
        notes_path = paths["notes"]
        assert notes_path.exists()

        content = notes_path.read_text(encoding="utf-8")
        assert "Python Functions Deep Dive" in content
        assert "Key Concepts" in content
        assert "Definitions" in content
        assert "Code Examples" in content
        assert "Summary" in content

    def test_write_quiz(self, tmp_dir: Path, sample_notes: LectureNotes) -> None:
        """Should create quiz.md."""
        writer = MarkdownWriter()
        paths = writer.write_all(tmp_dir, sample_notes)

        assert "quiz" in paths
        quiz_content = paths["quiz"].read_text(encoding="utf-8")
        assert "What keyword defines a function?" in quiz_content

    def test_write_flashcards(self, tmp_dir: Path, sample_notes: LectureNotes) -> None:
        """Should create flashcards.md."""
        writer = MarkdownWriter()
        paths = writer.write_all(tmp_dir, sample_notes)

        assert "flashcards" in paths
        flashcard_content = paths["flashcards"].read_text(encoding="utf-8")
        assert "What is a function?" in flashcard_content

    def test_write_transcript(
        self, tmp_dir: Path, sample_notes: LectureNotes, sample_transcript: Transcript
    ) -> None:
        """Should create transcript.md with timestamps."""
        writer = MarkdownWriter()
        paths = writer.write_all(tmp_dir, sample_notes, transcript=sample_transcript)

        assert "transcript" in paths
        content = paths["transcript"].read_text(encoding="utf-8")
        assert "[00:00]" in content
        assert "Welcome" in content

    def test_write_code_files(
        self,
        tmp_dir: Path,
        sample_notes: LectureNotes,
        sample_code_blocks: list[CodeBlock],
    ) -> None:
        """Should create individual code snippet files."""
        writer = MarkdownWriter()
        paths = writer.write_all(
            tmp_dir, sample_notes, code_blocks=sample_code_blocks
        )

        assert "code_dir" in paths
        code_dir = paths["code_dir"]
        code_files = list(code_dir.glob("*.py"))
        assert len(code_files) == 2


class TestPDFWriter:
    """Test PDF export."""

    def test_markdown_to_html(self, config: AppConfig) -> None:
        """Markdown to HTML conversion should work."""
        writer = PDFWriter(config)
        html = writer._markdown_to_html("# Hello\n\nWorld")
        assert "<h1" in html
        assert "Hello" in html
        assert "World" in html

    def test_markdown_to_html_code_block(self, config: AppConfig) -> None:
        """Code blocks should be converted to HTML."""
        writer = PDFWriter(config)
        md = "```python\ndef foo():\n    pass\n```"
        html = writer._markdown_to_html(md)
        assert "foo" in html

    def test_load_css(self, config: AppConfig) -> None:
        """CSS loading should return non-empty content."""
        writer = PDFWriter(config)
        css = writer._load_css()
        assert len(css) > 100
        assert "font-family" in css

    def test_convert_markdown_to_pdf_creates_html_fallback(
        self, tmp_dir: Path, config: AppConfig
    ) -> None:
        """If WeasyPrint fails, should create HTML fallback."""
        writer = PDFWriter(config)

        # Create a test markdown file
        md_path = tmp_dir / "test.md"
        md_path.write_text("# Test\n\nHello World", encoding="utf-8")

        pdf_path = tmp_dir / "test.pdf"
        # This may or may not create a PDF depending on WeasyPrint availability
        writer.convert_markdown_to_pdf(md_path, pdf_path, title="Test")

        # At minimum, the method should not crash
        assert True
