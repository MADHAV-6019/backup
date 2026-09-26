"""
Shared test fixtures and configuration for pytest.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from notes_ai.core.config import AppConfig
from notes_ai.core.database import Database
from notes_ai.core.models import (
    CodeBlock,
    Course,
    CourseSection,
    Lecture,
    Transcript,
    TranscriptSegment,
)


@pytest.fixture
def tmp_dir(tmp_path: Path) -> Path:
    """Provide a clean temporary directory for test output."""
    return tmp_path


@pytest.fixture
def config(tmp_dir: Path) -> AppConfig:
    """Provide a test configuration with temp output directory."""
    return AppConfig(
        general={"output_dir": str(tmp_dir / "output"), "log_level": "DEBUG"},
        browser={"user_data_dir": str(tmp_dir / "browser_data"), "headless": True},
        transcription={"model_size": "tiny", "device": "cpu", "compute_type": "int8"},
    )


@pytest.fixture
def database(tmp_dir: Path) -> Database:
    """Provide a fresh SQLite test database."""
    db = Database(tmp_dir / "test.db")
    yield db
    db.close()


@pytest.fixture
def sample_transcript() -> Transcript:
    """Provide a sample transcript for testing."""
    return Transcript(
        segments=[
            TranscriptSegment(start=0.0, end=5.0, text="Welcome to this lecture on Python.", confidence=0.95),
            TranscriptSegment(start=5.0, end=12.0, text="Today we'll learn about functions.", confidence=0.92),
            TranscriptSegment(start=12.0, end=20.0, text="A function is a reusable block of code.", confidence=0.88),
            TranscriptSegment(start=20.0, end=30.0, text="You define a function using the def keyword.", confidence=0.91),
            TranscriptSegment(start=30.0, end=40.0, text="Functions can take parameters and return values.", confidence=0.90),
        ],
        language="en",
        language_probability=0.98,
        duration_seconds=40.0,
    )


@pytest.fixture
def sample_code_blocks() -> list[CodeBlock]:
    """Provide sample code blocks for testing."""
    return [
        CodeBlock(
            code='def greet(name):\n    """Greet a person."""\n    return f"Hello, {name}!"',
            language="python",
            source_frame_index=3,
            timestamp_seconds=15.0,
            confidence=0.85,
        ),
        CodeBlock(
            code="result = greet('World')\nprint(result)",
            language="python",
            source_frame_index=5,
            timestamp_seconds=25.0,
            confidence=0.82,
        ),
    ]


@pytest.fixture
def sample_course() -> Course:
    """Provide a sample course structure for testing."""
    return Course(
        title="Complete Python Bootcamp",
        url="https://www.udemy.com/course/complete-python-bootcamp/",
        instructor="John Doe",
        total_lectures=5,
        total_duration_seconds=3600.0,
        sections=[
            CourseSection(
                title="Introduction",
                index=1,
                lectures=[
                    Lecture(index=1, title="Welcome", duration_seconds=120.0, content_type="video"),
                    Lecture(index=2, title="Setup", duration_seconds=300.0, content_type="video"),
                ],
            ),
            CourseSection(
                title="Python Basics",
                index=2,
                lectures=[
                    Lecture(index=3, title="Variables", duration_seconds=600.0, content_type="video"),
                    Lecture(index=4, title="Functions", duration_seconds=900.0, content_type="video"),
                    Lecture(index=5, title="Quiz", duration_seconds=0.0, content_type="quiz"),
                ],
            ),
        ],
    )
