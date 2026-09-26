"""Tests for utility helpers."""

from __future__ import annotations

import pytest

from notes_ai.utils.helpers import (
    Timer,
    chunk_text,
    format_duration,
    format_timestamp,
    safe_filename,
    slugify,
    truncate_text,
)


class TestSlugify:
    def test_basic(self) -> None:
        assert slugify("Hello World") == "hello-world"

    def test_special_chars(self) -> None:
        assert slugify("Lecture 3: Introduction to ML!") == "lecture-3-introduction-to-ml"

    def test_max_length(self) -> None:
        result = slugify("A" * 200, max_length=10)
        assert len(result) <= 10

    def test_consecutive_spaces(self) -> None:
        assert slugify("hello   world") == "hello-world"


class TestFormatDuration:
    def test_minutes_seconds(self) -> None:
        assert format_duration(125) == "2:05"

    def test_hours(self) -> None:
        assert format_duration(3661) == "1:01:01"

    def test_zero(self) -> None:
        assert format_duration(0) == "0:00"


class TestFormatTimestamp:
    def test_basic(self) -> None:
        assert format_timestamp(65) == "[01:05]"

    def test_zero(self) -> None:
        assert format_timestamp(0) == "[00:00]"


class TestTruncateText:
    def test_short(self) -> None:
        assert truncate_text("short", 100) == "short"

    def test_long(self) -> None:
        result = truncate_text("a" * 300, 200)
        assert len(result) == 200
        assert result.endswith("...")


class TestSafeFilename:
    def test_removes_invalid_chars(self) -> None:
        assert safe_filename('file<>:"/\\|?*name') == "filename"


class TestChunkText:
    def test_short_text(self) -> None:
        chunks = chunk_text("short text", chunk_size=100)
        assert len(chunks) == 1

    def test_long_text(self) -> None:
        text = "word " * 1000
        chunks = chunk_text(text, chunk_size=200, overlap=20)
        assert len(chunks) > 1
        assert all(len(c) <= 210 for c in chunks)  # Allow some margin

    def test_overlap(self) -> None:
        text = "A" * 500
        chunks = chunk_text(text, chunk_size=200, overlap=50)
        assert len(chunks) >= 2


class TestTimer:
    def test_timer(self) -> None:
        import time
        with Timer() as t:
            time.sleep(0.05)
        assert t.elapsed >= 0.04
        assert t.elapsed < 1.0
