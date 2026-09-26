"""
Shared helper utilities used across the pipeline.
"""

from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Any


def slugify(text: str, max_length: int = 80) -> str:
    """
    Convert a string into a filesystem-safe slug.

    Args:
        text: The raw string (e.g. a lecture title).
        max_length: Maximum slug length.

    Returns:
        Lowercase, hyphen-separated slug with no special characters.

    Example:
        >>> slugify("Lecture 3: Introduction to ML!")
        'lecture-3-introduction-to-ml'
    """
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)       # Remove non-alphanumeric
    slug = re.sub(r"[\s_]+", "-", slug)         # Spaces/underscores → hyphens
    slug = re.sub(r"-+", "-", slug).strip("-")  # Collapse hyphens
    return slug[:max_length]


def ensure_dir(path: Path) -> Path:
    """Create directory (and parents) if it doesn't exist, then return it."""
    path.mkdir(parents=True, exist_ok=True)
    return path


def format_duration(seconds: float) -> str:
    """
    Format a duration in seconds to HH:MM:SS or MM:SS.

    Args:
        seconds: Duration in seconds.

    Returns:
        Human-readable duration string.

    Example:
        >>> format_duration(3661.5)
        '1:01:01'
    """
    total = int(seconds)
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def format_timestamp(seconds: float) -> str:
    """
    Format seconds into [MM:SS] timestamp for transcripts.

    Args:
        seconds: Time in seconds.

    Returns:
        Bracketed timestamp string.
    """
    minutes, secs = divmod(int(seconds), 60)
    return f"[{minutes:02d}:{secs:02d}]"


def truncate_text(text: str, max_chars: int = 200) -> str:
    """Truncate text with ellipsis if it exceeds max_chars."""
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3] + "..."


def safe_filename(name: str) -> str:
    """Remove characters that are invalid in filenames on Windows/Linux."""
    return re.sub(r'[<>:"/\\|?*]', "", name).strip()


class Timer:
    """
    Simple context manager for timing operations.

    Usage::

        with Timer() as t:
            do_work()
        print(f"Took {t.elapsed:.2f}s")
    """

    def __init__(self) -> None:
        self.start_time: float = 0.0
        self.end_time: float = 0.0
        self.elapsed: float = 0.0

    def __enter__(self) -> "Timer":
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, *args: Any) -> None:
        self.end_time = time.perf_counter()
        self.elapsed = self.end_time - self.start_time


def chunk_text(text: str, chunk_size: int = 4000, overlap: int = 200) -> list[str]:
    """
    Split text into overlapping chunks for LLM processing.

    Args:
        text: The full text to split.
        chunk_size: Maximum characters per chunk.
        overlap: Number of overlapping characters between chunks.

    Returns:
        List of text chunks.
    """
    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size

        # Try to break at a sentence boundary
        if end < len(text):
            # Look for the last period/newline within the chunk
            last_period = text.rfind(".", start, end)
            last_newline = text.rfind("\n", start, end)
            break_point = max(last_period, last_newline)
            if break_point > start + chunk_size // 2:
                end = break_point + 1

        chunks.append(text[start:end].strip())
        start = end - overlap

    return chunks
