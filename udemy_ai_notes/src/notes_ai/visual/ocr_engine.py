"""
OCR engine — extracts text from video frame screenshots.

Uses EasyOCR for text detection and recognition, with region
classification to identify headings, body text, code, and formulas.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from notes_ai.core.config import AppConfig
from notes_ai.core.models import BoundingBox, OCRResult, SlideFrame
from notes_ai.utils.logging import get_logger

logger = get_logger("visual.ocr_engine")


class OCREngine:
    """
    EasyOCR-based text extraction engine.

    Extracts text from video frame screenshots and classifies
    detected regions as headings, body, code, or formulas.
    """

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.visual_cfg = config.visual
        self._reader = None

    def _load_reader(self) -> None:
        """Lazy-load the EasyOCR reader."""
        if self._reader is not None:
            return

        import easyocr

        # Detect GPU availability
        use_gpu = False
        try:
            import torch
            use_gpu = torch.cuda.is_available()
        except ImportError:
            pass

        logger.info("Loading EasyOCR reader (GPU=%s)...", use_gpu)
        self._reader = easyocr.Reader(
            [self.config.general.language],
            gpu=use_gpu,
        )
        logger.info("EasyOCR reader loaded")

    def extract_text(self, frame: np.ndarray) -> list[OCRResult]:
        """
        Run OCR on a single frame and return detected text regions.

        Args:
            frame: OpenCV image array (BGR or grayscale).

        Returns:
            List of ``OCRResult`` objects with text, confidence, and bounding boxes.
        """
        self._load_reader()

        try:
            raw_results = self._reader.readtext(frame)
        except Exception as e:
            logger.error("OCR failed: %s", e)
            return []

        results: list[OCRResult] = []
        threshold = self.visual_cfg.ocr_confidence_threshold

        for bbox_points, text, confidence in raw_results:
            if confidence < threshold:
                continue

            # Skip UI elements (player controls, timestamps, etc.)
            if self._is_ui_element(text, bbox_points, frame.shape):
                continue

            text = text.strip()
            if not text:
                continue

            # Convert bounding box
            x_coords = [int(p[0]) for p in bbox_points]
            y_coords = [int(p[1]) for p in bbox_points]
            bbox = BoundingBox(
                x=min(x_coords),
                y=min(y_coords),
                width=max(x_coords) - min(x_coords),
                height=max(y_coords) - min(y_coords),
            )

            # Classify region type
            region_type = self._classify_region(text, bbox, frame.shape)

            results.append(OCRResult(
                text=text,
                confidence=confidence,
                bounding_box=bbox,
                region_type=region_type,
            ))

        return results

    def process_slides(self, slides: list[SlideFrame]) -> list[SlideFrame]:
        """
        Run OCR on all unique slide frames.

        Args:
            slides: List of ``SlideFrame`` objects with ``image_path`` set.

        Returns:
            The same slides list with ``ocr_results`` populated.
        """
        self._load_reader()

        logger.info("Running OCR on %d slides...", len(slides))

        for i, slide in enumerate(slides):
            if slide.image_path is None or not slide.image_path.exists():
                continue

            frame = cv2.imread(str(slide.image_path))
            if frame is None:
                continue

            slide.ocr_results = self.extract_text(frame)

            # Check if this is primarily a code slide
            code_results = [r for r in slide.ocr_results if r.region_type == "code"]
            if len(code_results) > len(slide.ocr_results) * 0.5:
                slide.is_code_slide = True

            if (i + 1) % 10 == 0:
                logger.info("OCR progress: %d/%d slides", i + 1, len(slides))

        total_text = sum(len(s.ocr_results) for s in slides)
        logger.info("OCR complete: extracted %d text regions from %d slides", total_text, len(slides))

        return slides

    def _is_ui_element(
        self,
        text: str,
        bbox_points: list,
        frame_shape: tuple,
    ) -> bool:
        """
        Detect and filter out UI elements (player controls, navigation, etc.).

        Heuristics:
        - Text in bottom 10% of frame (player controls)
        - Very short text (< 3 chars) at edges
        - Common UI patterns (timestamps like "12:34", "CC", etc.)

        Args:
            text: Detected text string.
            bbox_points: Bounding box corner points.
            frame_shape: Frame dimensions (h, w, c).

        Returns:
            True if the text appears to be a UI element.
        """
        import re

        h, w = frame_shape[:2]
        y_coords = [int(p[1]) for p in bbox_points]
        x_coords = [int(p[0]) for p in bbox_points]
        avg_y = sum(y_coords) / len(y_coords)
        avg_x = sum(x_coords) / len(x_coords)

        text_lower = text.strip().lower()

        # Bottom 10% — likely player controls
        if avg_y > h * 0.90:
            return True

        # Very top — likely browser tabs/address bar
        if avg_y < h * 0.03:
            return True

        # Common UI text patterns
        ui_patterns = [
            r"^\d{1,2}:\d{2}$",         # Timestamps
            r"^\d{1,2}:\d{2}:\d{2}$",   # Long timestamps
            r"^(cc|hd|sd|auto)$",        # Video quality labels
            r"^(play|pause|stop)$",
            r"^\d+x$",                   # Playback speed
            r"^(mute|unmute)$",
            r"^(fullscreen|exit)$",
            r"^(settings|share)$",
        ]
        for pattern in ui_patterns:
            if re.match(pattern, text_lower):
                return True

        return False

    def _classify_region(
        self,
        text: str,
        bbox: BoundingBox,
        frame_shape: tuple,
    ) -> str:
        """
        Classify a text region as heading, body, code, or formula.

        Heuristics:
        - Large text near top → heading
        - Monospace-like (many special chars, indentation) → code
        - Math symbols → formula
        - Everything else → body

        Args:
            text: The detected text.
            bbox: Bounding box of the text region.
            frame_shape: Frame dimensions.

        Returns:
            Region type string: "heading", "body", "code", or "formula".
        """
        h, w = frame_shape[:2]

        # Heading: large, near top of slide
        if bbox.y < h * 0.15 and bbox.height > h * 0.04:
            return "heading"

        # Code detection: special characters, indentation patterns
        code_indicators = [
            "def ", "class ", "import ", "from ", "return ",
            "function ", "const ", "let ", "var ",
            "if (", "for (", "while (",
            "=>", "->", "::", "//", "/*", "*/",
            "print(", "console.", "System.",
            "{", "}", "()", "[];",
        ]
        if any(ind in text for ind in code_indicators):
            return "code"

        # Formula: math symbols
        math_symbols = ["∑", "∏", "∫", "√", "≤", "≥", "≠", "±", "×", "÷", "∈", "∀", "∃"]
        if any(sym in text for sym in math_symbols):
            return "formula"

        # Check for high density of special characters (code-like)
        special_count = sum(1 for c in text if c in "{}[]();=<>+-*/&|!~^%#@")
        if len(text) > 5 and special_count / len(text) > 0.15:
            return "code"

        return "body"

    def get_full_text(self, slides: list[SlideFrame]) -> str:
        """
        Concatenate all OCR text from slides into a single string.

        Args:
            slides: List of processed slides with OCR results.

        Returns:
            Combined text from all slides.
        """
        texts: list[str] = []
        for slide in slides:
            slide_text = " ".join(r.text for r in slide.ocr_results)
            if slide_text.strip():
                texts.append(slide_text.strip())
        return "\n\n".join(texts)
