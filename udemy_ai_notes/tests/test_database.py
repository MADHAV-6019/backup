"""Tests for the SQLite database module."""

from __future__ import annotations

import pytest

from notes_ai.core.database import Database
from notes_ai.core.models import LectureMetadata, ProcessingStatus


class TestDatabase:
    """Test database operations."""

    def test_save_and_get_course(self, database: Database) -> None:
        """Should save and retrieve a course."""
        database.save_course(
            url="https://udemy.com/course/test",
            title="Test Course",
            instructor="Jane",
            total_lectures=10,
        )
        course = database.get_course("https://udemy.com/course/test")
        assert course is not None
        assert course["title"] == "Test Course"
        assert course["instructor"] == "Jane"
        assert course["total_lectures"] == 10

    def test_list_courses(self, database: Database) -> None:
        """Should list all saved courses."""
        database.save_course(url="https://udemy.com/course/a", title="Course A")
        database.save_course(url="https://udemy.com/course/b", title="Course B")
        courses = database.list_courses()
        assert len(courses) == 2

    def test_save_lecture(self, database: Database) -> None:
        """Should save and retrieve lectures."""
        url = "https://udemy.com/course/test"
        database.save_course(url=url, title="Test")
        database.save_lecture(url, 1, "Intro", "Section 1", 120.0)
        database.save_lecture(url, 2, "Basics", "Section 1", 300.0)

        lectures = database.get_all_lectures(url)
        assert len(lectures) == 2
        assert lectures[0]["title"] == "Intro"

    def test_update_lecture_status(self, database: Database) -> None:
        """Should update lecture processing status."""
        url = "https://udemy.com/course/test"
        database.save_course(url=url, title="Test")
        database.save_lecture(url, 1, "Intro")

        database.update_lecture_status(url, 1, ProcessingStatus.COMPLETED)
        status = database.get_lecture_status(url, 1)
        assert status == "completed"

    def test_get_pending_lectures(self, database: Database) -> None:
        """Should return only non-completed lectures."""
        url = "https://udemy.com/course/test"
        database.save_course(url=url, title="Test")
        database.save_lecture(url, 1, "Intro")
        database.save_lecture(url, 2, "Basics")
        database.save_lecture(url, 3, "Advanced")

        database.update_lecture_status(url, 1, ProcessingStatus.COMPLETED)

        pending = database.get_pending_lectures(url)
        assert len(pending) == 2

    def test_progress_tracking(self, database: Database) -> None:
        """Should track and retrieve progress."""
        url = "https://udemy.com/course/test"
        database.save_course(url=url, title="Test", total_lectures=10)
        database.update_progress(url, last_index=5, completed=5, failed=1)

        progress = database.get_progress(url)
        assert progress is not None
        assert progress.completed_lectures == 5
        assert progress.failed_lectures == 1
        assert progress.progress_percent == 50.0

    def test_reset_course(self, database: Database) -> None:
        """Should delete all data for a course."""
        url = "https://udemy.com/course/test"
        database.save_course(url=url, title="Test")
        database.save_lecture(url, 1, "Intro")
        database.update_progress(url, 1, 1, 0)

        database.reset_course(url)

        assert database.get_course(url) is None
        assert len(database.get_all_lectures(url)) == 0

    def test_context_manager(self, tmp_dir) -> None:
        """Should work as a context manager."""
        with Database(tmp_dir / "ctx.db") as db:
            db.save_course(url="http://test", title="Test")
            assert db.get_course("http://test") is not None
