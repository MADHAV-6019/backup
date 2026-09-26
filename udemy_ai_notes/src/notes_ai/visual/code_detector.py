"""
Code detector — identifies and extracts code from video frames.

Detects code editor regions using visual heuristics (dark backgrounds,
monospace fonts), extracts code text, identifies the programming language,
and merges duplicate code blocks across frames.
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from notes_ai.core.config import AppConfig
from notes_ai.core.models import CodeBlock, OCRResult, SlideFrame
from notes_ai.utils.logging import get_logger

logger = get_logger("visual.code_detector")

# ---------------------------------------------------------------------------
# Language detection patterns
# ---------------------------------------------------------------------------

LANGUAGE_PATTERNS: dict[str, list[str]] = {
    "python": [
        r"\bdef\s+\w+\s*\(", r"\bclass\s+\w+", r"\bimport\s+\w+",
        r"\bfrom\s+\w+\s+import", r"\bself\.", r"\bprint\s*\(",
        r"\bif\s+__name__\s*==", r":\s*$", r"\belif\b", r"\bexcept\b",
        r"\b(np|pd|plt|tf|torch|sklearn)\.", r"\bdef\b.*->",
        r"\.fit\(", r"\.predict\(", r"\.transform\(",
    ],
    "javascript": [
        r"\bconst\s+\w+", r"\blet\s+\w+", r"\bvar\s+\w+",
        r"\bfunction\s*\(", r"=>\s*{", r"\bconsole\.\w+",
        r"\basync\b", r"\bawait\b", r"\brequire\s*\(",
        r"\bexport\s+(default\s+)?", r"\.then\s*\(",
    ],
    "java": [
        r"\bpublic\s+(static\s+)?(void|int|String|class)",
        r"\bSystem\.out\.print", r"\bprivate\s+", r"\bprotected\s+",
        r"@Override", r"\bextends\b", r"\bimplements\b",
    ],
    "cpp": [
        r"#include\s*[<\"]", r"\bstd::", r"\bcout\b", r"\bcin\b",
        r"\bvector<", r"\bint\s+main\s*\(", r"::\w+",
        r"\btemplate\s*<", r"\bnamespace\b",
    ],
    "sql": [
        r"\bSELECT\b", r"\bFROM\b", r"\bWHERE\b", r"\bINSERT\b",
        r"\bUPDATE\b", r"\bDELETE\b", r"\bCREATE\s+TABLE\b",
        r"\bJOIN\b", r"\bGROUP\s+BY\b", r"\bORDER\s+BY\b",
    ],
    "html": [
        r"<html", r"<div", r"<span", r"<body", r"<head",
        r"class=\"", r"id=\"", r"</\w+>",
    ],
    "css": [
        r"\{[^}]*:[^}]*;\s*\}", r"\.[\w-]+\s*\{",
        r"#[\w-]+\s*\{", r"@media\b", r"@import\b",
    ],
    "bash": [
        r"#!/bin/(ba)?sh", r"\becho\b", r"\bsudo\b",
        r"\bapt(-get)?\b", r"\bpip\s+install\b", r"\bnpm\b",
        r"\$\{?\w+\}?", r"\bgrep\b", r"\bawk\b",
    ],
    "r": [
        r"<-\s", r"\blibrary\s*\(", r"\bggplot\b",
        r"\bdata\.frame\b", r"\bfunction\s*\(",
    ],
}


class CodeDetector:
    """
    Detects and extracts code from video frame screenshots.

    Combines visual heuristics (dark region detection) with OCR text
    analysis to identify code blocks, detect their language, and
    merge duplicates across frames.
    """

    def __init__(self, config: AppConfig) -> None:
        self.config = config

    def detect_code_regions(self, frame: np.ndarray) -> list[tuple[int, int, int, int]]:
        """
        Detect dark rectangular regions that likely contain code editors.

        Uses color analysis to find dark-background areas (IDEs, terminals).

        Args:
            frame: BGR image array.

        Returns:
            List of (x, y, w, h) bounding boxes for detected code regions.
        """
        h, w = frame.shape[:2]

        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Threshold for dark regions (code editors typically have dark backgrounds)
        _, dark_mask = cv2.threshold(gray, 60, 255, cv2.THRESH_BINARY_INV)

        # Morphological operations to connect nearby dark regions
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 10))
        dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_CLOSE, kernel)
        dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_OPEN, kernel)

        # Find contours of dark regions
        contours, _ = cv2.findContours(dark_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        code_regions: list[tuple[int, int, int, int]] = []
        min_area = h * w * 0.05  # At least 5% of frame

        for contour in contours:
            x, y, cw, ch = cv2.boundingRect(contour)
            area = cw * ch

            # Filter: must be reasonably large and wider than tall (code editors)
            if area >= min_area and cw > ch * 0.5:
                code_regions.append((x, y, cw, ch))

        return code_regions

    def extract_code_blocks(
        self,
        slides: list[SlideFrame],
    ) -> list[CodeBlock]:
        """
        Extract all code blocks from processed slides.

        Collects OCR text classified as "code", detects the programming
        language, and preserves exact formatting.

        Args:
            slides: Slides with ``ocr_results`` already populated by OCR engine.

        Returns:
            List of detected ``CodeBlock`` objects.
        """
        raw_blocks: list[CodeBlock] = []

        for slide in slides:
            code_texts: list[str] = []

            for result in slide.ocr_results:
                if result.region_type == "code":
                    code_texts.append(result.text)

            if code_texts:
                # Combine code text from this slide
                combined_code = "\n".join(code_texts)

                # Detect language
                language = self.detect_language(combined_code)

                # Calculate average confidence
                code_results = [r for r in slide.ocr_results if r.region_type == "code"]
                avg_conf = (
                    sum(r.confidence for r in code_results) / len(code_results)
                    if code_results
                    else 0.0
                )

                raw_blocks.append(CodeBlock(
                    code=combined_code,
                    language=language,
                    source_frame_index=slide.frame_index,
                    timestamp_seconds=slide.timestamp_seconds,
                    confidence=avg_conf,
                ))

        # Merge duplicates
        merged = self.merge_duplicate_blocks(raw_blocks)

        logger.info(
            "Extracted %d code blocks (%d before dedup)",
            len(merged),
            len(raw_blocks),
        )
        return merged

    def detect_language(self, code: str) -> str:
        """
        Detect the programming language of a code snippet.

        Uses pattern matching against known language signatures.

        Args:
            code: The code text.

        Returns:
            Detected language name (e.g., "python", "javascript") or "text".
        """
        scores: dict[str, int] = {}

        for lang, patterns in LANGUAGE_PATTERNS.items():
            score = 0
            for pattern in patterns:
                matches = re.findall(pattern, code, re.IGNORECASE | re.MULTILINE)
                score += len(matches)
            if score > 0:
                scores[lang] = score

        if not scores:
            return "text"

        # Return the language with the highest score
        best = max(scores, key=scores.get)
        logger.debug("Language detection: %s (scores=%s)", best, scores)
        return best

    def merge_duplicate_blocks(
        self,
        blocks: list[CodeBlock],
        similarity_threshold: float = 0.75,
    ) -> list[CodeBlock]:
        """
        Merge code blocks that appear across multiple frames.

        Uses fuzzy string matching to identify duplicates.
        When duplicates are found, keeps the longest version
        (most complete capture).

        Args:
            blocks: Raw list of detected code blocks.
            similarity_threshold: Minimum similarity ratio to consider as duplicate.

        Returns:
            Deduplicated list of code blocks.
        """
        if len(blocks) <= 1:
            return blocks

        merged: list[CodeBlock] = []

        for block in blocks:
            is_dup = False

            for i, existing in enumerate(merged):
                similarity = SequenceMatcher(
                    None,
                    block.code.strip(),
                    existing.code.strip(),
                ).ratio()

                if similarity >= similarity_threshold:
                    is_dup = True
                    # Keep the longer (more complete) version
                    if len(block.code) > len(existing.code):
                        merged[i] = block
                    break

            if not is_dup:
                merged.append(block)

        return merged

    def clean_code_text(self, code: str) -> str:
        """
        Clean up OCR artifacts in code text.

        Fixes common OCR mistakes in code:
        - Stray characters from bounding boxes
        - Line number artifacts
        - Broken indentation

        Args:
            code: Raw OCR code text.

        Returns:
            Cleaned code text.
        """
        lines = code.split("\n")
        cleaned: list[str] = []

        for line in lines:
            # Remove line numbers at the start (e.g., "1 ", "12 ", "123 ")
            line = re.sub(r"^\s*\d{1,4}\s{1,2}(?=\S)", "", line)

            # Remove common OCR artifacts
            line = line.replace("¢", "c")
            line = line.replace("©", "(c)")
            line = line.replace("®", "(r)")
            line = line.replace(""", '"')
            line = line.replace(""", '"')
            line = line.replace("'", "'")
            line = line.replace("'", "'")

            cleaned.append(line)

        return "\n".join(cleaned)
