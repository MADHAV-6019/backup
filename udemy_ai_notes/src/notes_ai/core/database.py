"""
SQLite metadata store — tracks courses, lectures, and processing progress.

Provides checkpoint/resume capability so interrupted runs can continue
from the last successfully processed lecture.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from notes_ai.core.models import (
    CourseProgress,
    LectureMetadata,
    ProcessingStatus,
)


class Database:
    """Lightweight SQLite wrapper for progress tracking and metadata storage."""

    def __init__(self, db_path: Path) -> None:
        """
        Initialize the database, creating tables if they don't exist.

        Args:
            db_path: Path to the SQLite database file.
        """
        self.db_path = db_path
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(db_path))
        self._conn.row_factory = sqlite3.Row
        self._create_tables()

    # ------------------------------------------------------------------
    # Schema
    # ------------------------------------------------------------------

    def _create_tables(self) -> None:
        """Create the schema if it doesn't already exist."""
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS courses (
                url             TEXT PRIMARY KEY,
                title           TEXT NOT NULL,
                instructor      TEXT,
                total_lectures  INTEGER DEFAULT 0,
                total_duration  REAL DEFAULT 0.0,
                scanned_at      TEXT,
                data_json       TEXT
            );

            CREATE TABLE IF NOT EXISTS lectures (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                course_url      TEXT NOT NULL,
                lecture_index   INTEGER NOT NULL,
                title           TEXT NOT NULL,
                section_title   TEXT,
                duration        REAL DEFAULT 0.0,
                content_type    TEXT DEFAULT 'video',
                status          TEXT DEFAULT 'pending',
                processing_time REAL DEFAULT 0.0,
                num_screenshots INTEGER DEFAULT 0,
                num_code_blocks INTEGER DEFAULT 0,
                num_concepts    INTEGER DEFAULT 0,
                word_count      INTEGER DEFAULT 0,
                transcript_conf REAL DEFAULT 0.0,
                error_message   TEXT,
                processed_at    TEXT,
                metadata_json   TEXT,
                UNIQUE(course_url, lecture_index)
            );

            CREATE TABLE IF NOT EXISTS progress (
                course_url          TEXT PRIMARY KEY,
                last_processed_idx  INTEGER DEFAULT 0,
                completed_count     INTEGER DEFAULT 0,
                failed_count        INTEGER DEFAULT 0,
                started_at          TEXT,
                updated_at          TEXT
            );
            """
        )
        self._conn.commit()

    # ------------------------------------------------------------------
    # Course operations
    # ------------------------------------------------------------------

    def save_course(
        self,
        url: str,
        title: str,
        instructor: Optional[str] = None,
        total_lectures: int = 0,
        total_duration: float = 0.0,
        data_json: Optional[str] = None,
    ) -> None:
        """Insert or update a course record."""
        now = datetime.now(timezone.utc).isoformat()
        self._conn.execute(
            """
            INSERT INTO courses (url, title, instructor, total_lectures, total_duration, scanned_at, data_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(url) DO UPDATE SET
                title=excluded.title,
                instructor=excluded.instructor,
                total_lectures=excluded.total_lectures,
                total_duration=excluded.total_duration,
                scanned_at=excluded.scanned_at,
                data_json=excluded.data_json
            """,
            (url, title, instructor, total_lectures, total_duration, now, data_json),
        )
        self._conn.commit()

    def get_course(self, url: str) -> Optional[dict]:
        """Retrieve a course record by URL."""
        row = self._conn.execute("SELECT * FROM courses WHERE url = ?", (url,)).fetchone()
        return dict(row) if row else None

    def list_courses(self) -> list[dict]:
        """Return all stored courses."""
        rows = self._conn.execute("SELECT * FROM courses ORDER BY scanned_at DESC").fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Lecture operations
    # ------------------------------------------------------------------

    def save_lecture(
        self,
        course_url: str,
        lecture_index: int,
        title: str,
        section_title: Optional[str] = None,
        duration: float = 0.0,
        content_type: str = "video",
    ) -> None:
        """Insert or update a lecture record."""
        self._conn.execute(
            """
            INSERT INTO lectures (course_url, lecture_index, title, section_title, duration, content_type)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(course_url, lecture_index) DO UPDATE SET
                title=excluded.title,
                section_title=excluded.section_title,
                duration=excluded.duration,
                content_type=excluded.content_type
            """,
            (course_url, lecture_index, title, section_title, duration, content_type),
        )
        self._conn.commit()

    def update_lecture_status(
        self,
        course_url: str,
        lecture_index: int,
        status: ProcessingStatus,
        metadata: Optional[LectureMetadata] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Update the processing status and metadata for a lecture."""
        now = datetime.now(timezone.utc).isoformat()
        meta_json = metadata.model_dump_json() if metadata else None

        updates = {
            "status": status.value,
            "processed_at": now,
            "error_message": error_message,
            "metadata_json": meta_json,
        }
        if metadata:
            updates.update(
                {
                    "processing_time": metadata.processing_time_seconds,
                    "num_screenshots": metadata.num_screenshots,
                    "num_code_blocks": metadata.num_code_blocks,
                    "num_concepts": metadata.num_concepts,
                    "word_count": metadata.word_count,
                    "transcript_conf": metadata.transcript_confidence,
                }
            )

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [course_url, lecture_index]

        self._conn.execute(
            f"UPDATE lectures SET {set_clause} WHERE course_url = ? AND lecture_index = ?",
            values,
        )
        self._conn.commit()

    def get_lecture_status(self, course_url: str, lecture_index: int) -> Optional[str]:
        """Get the current processing status of a lecture."""
        row = self._conn.execute(
            "SELECT status FROM lectures WHERE course_url = ? AND lecture_index = ?",
            (course_url, lecture_index),
        ).fetchone()
        return row["status"] if row else None

    def get_pending_lectures(self, course_url: str) -> list[dict]:
        """Return lectures that haven't been completed yet."""
        rows = self._conn.execute(
            """
            SELECT * FROM lectures
            WHERE course_url = ? AND status NOT IN ('completed', 'skipped')
            ORDER BY lecture_index
            """,
            (course_url,),
        ).fetchall()
        return [dict(r) for r in rows]

    def get_all_lectures(self, course_url: str) -> list[dict]:
        """Return all lectures for a course."""
        rows = self._conn.execute(
            "SELECT * FROM lectures WHERE course_url = ? ORDER BY lecture_index",
            (course_url,),
        ).fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Progress tracking
    # ------------------------------------------------------------------

    def update_progress(
        self,
        course_url: str,
        last_index: int,
        completed: int,
        failed: int,
    ) -> None:
        """Update the processing progress checkpoint for a course."""
        now = datetime.now(timezone.utc).isoformat()
        self._conn.execute(
            """
            INSERT INTO progress (course_url, last_processed_idx, completed_count, failed_count, started_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(course_url) DO UPDATE SET
                last_processed_idx = excluded.last_processed_idx,
                completed_count = excluded.completed_count,
                failed_count = excluded.failed_count,
                updated_at = excluded.updated_at
            """,
            (course_url, last_index, completed, failed, now, now),
        )
        self._conn.commit()

    def get_progress(self, course_url: str) -> Optional[CourseProgress]:
        """Get the processing progress for a course."""
        course = self.get_course(course_url)
        if not course:
            return None

        prog_row = self._conn.execute(
            "SELECT * FROM progress WHERE course_url = ?", (course_url,)
        ).fetchone()

        total = course.get("total_lectures", 0)
        completed = prog_row["completed_count"] if prog_row else 0
        failed = prog_row["failed_count"] if prog_row else 0

        return CourseProgress(
            course_title=course["title"],
            course_url=course_url,
            total_lectures=total,
            completed_lectures=completed,
            failed_lectures=failed,
            pending_lectures=max(0, total - completed - failed),
            last_processed_index=prog_row["last_processed_idx"] if prog_row else 0,
            started_at=(
                datetime.fromisoformat(prog_row["started_at"])
                if prog_row and prog_row["started_at"]
                else None
            ),
            updated_at=(
                datetime.fromisoformat(prog_row["updated_at"])
                if prog_row and prog_row["updated_at"]
                else None
            ),
        )

    def get_all_progress(self) -> list[CourseProgress]:
        """Get progress summaries for all known courses."""
        courses = self.list_courses()
        results: list[CourseProgress] = []
        for course in courses:
            prog = self.get_progress(course["url"])
            if prog:
                results.append(prog)
        return results

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def reset_course(self, course_url: str) -> None:
        """Delete all data for a course (for re-processing)."""
        self._conn.execute("DELETE FROM lectures WHERE course_url = ?", (course_url,))
        self._conn.execute("DELETE FROM progress WHERE course_url = ?", (course_url,))
        self._conn.execute("DELETE FROM courses WHERE url = ?", (course_url,))
        self._conn.commit()

    def close(self) -> None:
        """Close the database connection."""
        self._conn.close()

    def __enter__(self) -> "Database":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()
