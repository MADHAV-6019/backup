"""Tests for Pydantic domain models."""

from __future__ import annotations

import pytest

from notes_ai.core.models import (
    CodeBlock,
    Course,
    CourseProgress,
    CourseSection,
    Lecture,
    LectureMetadata,
    ProcessingStatus,
    Transcript,
    TranscriptSegment,
)


class TestTranscript:
    """Test Transcript model."""

    def test_full_text(self, sample_transcript: Transcript) -> None:
        """full_text should concatenate all segments."""
        text = sample_transcript.full_text
        assert "Welcome" in text
        assert "functions" in text
        assert "def keyword" in text

    def test_average_confidence(self, sample_transcript: Transcript) -> None:
        """average_confidence should compute the mean."""
        avg = sample_transcript.average_confidence
        assert 0.0 < avg < 1.0
        assert abs(avg - 0.912) < 0.01

    def test_empty_transcript(self) -> None:
        """Empty transcript should have zero confidence."""
        t = Transcript(segments=[])
        assert t.full_text == ""
        assert t.average_confidence == 0.0


class TestCourse:
    """Test Course model."""

    def test_all_lectures(self, sample_course: Course) -> None:
        """all_lectures should flatten sections."""
        assert len(sample_course.all_lectures) == 5

    def test_video_lectures(self, sample_course: Course) -> None:
        """video_lectures should exclude non-video content."""
        videos = sample_course.video_lectures
        assert len(videos) == 4
        assert all(l.content_type == "video" for l in videos)

    def test_course_metadata(self, sample_course: Course) -> None:
        """Course should have correct metadata."""
        assert sample_course.title == "Complete Python Bootcamp"
        assert sample_course.total_lectures == 5
        assert sample_course.instructor == "John Doe"


class TestCourseProgress:
    """Test CourseProgress model."""

    def test_progress_percent(self) -> None:
        """progress_percent should calculate correctly."""
        p = CourseProgress(
            course_title="Test",
            course_url="http://test",
            total_lectures=10,
            completed_lectures=3,
        )
        assert p.progress_percent == 30.0

    def test_zero_lectures(self) -> None:
        """Zero lectures should give 0% progress."""
        p = CourseProgress(
            course_title="Empty",
            course_url="http://test",
            total_lectures=0,
        )
        assert p.progress_percent == 0.0


class TestCodeBlock:
    """Test CodeBlock model."""

    def test_code_preservation(self) -> None:
        """Code text should be preserved exactly."""
        code = "def foo():\n    return 42\n"
        block = CodeBlock(code=code, language="python")
        assert block.code == code
        assert "\n" in block.code

    def test_language_detection_default(self) -> None:
        """Default language should be 'text'."""
        block = CodeBlock(code="hello")
        assert block.language == "text"


class TestLectureMetadata:
    """Test LectureMetadata model."""

    def test_default_status(self) -> None:
        """Default status should be PENDING."""
        meta = LectureMetadata(lecture_title="Test", lecture_index=1)
        assert meta.status == ProcessingStatus.PENDING
        assert meta.num_screenshots == 0
        assert meta.word_count == 0
