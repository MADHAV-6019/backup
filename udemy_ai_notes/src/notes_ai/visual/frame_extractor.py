"""
Frame extractor — captures and pre-processes video frames from screenshots.

Works with screenshots taken by LectureNavigator and prepares them
for slide detection and OCR processing.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from notes_ai.core.config import AppConfig
from notes_ai.core.models import SlideFrame
from notes_ai.utils.logging import get_logger

logger = get_logger("visual.frame_extractor")


class FrameExtractor:
    """Loads and pre-processes video frame screenshots for analysis."""

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.visual_cfg = config.visual

    def load_frame(self, image_path: Path) -> np.ndarray | None:
        """
        Load an image file as an OpenCV BGR array.

        Args:
            image_path: Path to a PNG/JPEG screenshot.

        Returns:
            OpenCV image array, or None on failure.
        """
        try:
            frame = cv2.imread(str(image_path))
            if frame is None:
                logger.warning("Could not load image: %s", image_path)
                return None
            return frame
        except Exception as e:
            logger.error("Error loading frame %s: %s", image_path, e)
            return None

    def preprocess_for_ocr(self, frame: np.ndarray) -> np.ndarray:
        """
        Pre-process a frame to improve OCR accuracy.

        Applies:
        - Grayscale conversion
        - Contrast enhancement (CLAHE)
        - Light denoising

        Args:
            frame: BGR image array.

        Returns:
            Pre-processed grayscale image.
        """
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Light denoising
        denoised = cv2.fastNlMeansDenoising(enhanced, h=10)

        return denoised

    def crop_video_area(
        self,
        frame: np.ndarray,
        margin_percent: float = 0.02,
    ) -> np.ndarray:
        """
        Crop out the browser chrome and controls from a full-page screenshot.

        Uses heuristics to focus on the main video content area,
        ignoring navigation bars, player controls, and sidebar.

        Args:
            frame: Full browser screenshot.
            margin_percent: Margin to trim from edges (as fraction).

        Returns:
            Cropped frame focusing on the video content.
        """
        h, w = frame.shape[:2]

        # Heuristic crop: remove top 5%, bottom 10%, left 2%, right 25% (sidebar)
        top = int(h * 0.05)
        bottom = int(h * 0.90)
        left = int(w * margin_percent)
        right = int(w * 0.75)  # Exclude right sidebar

        cropped = frame[top:bottom, left:right]

        if cropped.size == 0:
            logger.warning("Crop resulted in empty image; returning original")
            return frame

        return cropped

    def extract_frames_from_screenshots(
        self,
        screenshot_paths: list[Path],
    ) -> list[SlideFrame]:
        """
        Load all screenshots and create SlideFrame objects.

        Args:
            screenshot_paths: Ordered list of screenshot file paths.

        Returns:
            List of ``SlideFrame`` objects with image paths and indices.
        """
        frames: list[SlideFrame] = []

        for i, path in enumerate(screenshot_paths):
            # Extract timestamp from filename (e.g., frame_0001_15.0s.png)
            timestamp = self._parse_timestamp_from_filename(path.name)

            frames.append(SlideFrame(
                frame_index=i,
                timestamp_seconds=timestamp,
                image_path=path,
            ))

        logger.info("Loaded %d frames from screenshots", len(frames))
        return frames

    @staticmethod
    def _parse_timestamp_from_filename(filename: str) -> float:
        """
        Extract timestamp from a screenshot filename.

        Expected format: ``frame_NNNN_TT.Ts.png``

        Args:
            filename: Screenshot filename.

        Returns:
            Timestamp in seconds, or 0.0 if not found.
        """
        import re
        match = re.search(r"(\d+\.?\d*)s", filename)
        if match:
            return float(match.group(1))
        return 0.0

    def resize_for_ocr(
        self,
        frame: np.ndarray,
        max_width: int = 1920,
    ) -> np.ndarray:
        """
        Resize frame if it's too large for efficient OCR.

        Args:
            frame: Input image.
            max_width: Maximum width in pixels.

        Returns:
            Resized image (or original if already small enough).
        """
        h, w = frame.shape[:2]
        if w <= max_width:
            return frame

        scale = max_width / w
        new_h = int(h * scale)
        return cv2.resize(frame, (max_width, new_h), interpolation=cv2.INTER_AREA)
