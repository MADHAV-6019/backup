"""
Slide transition detector — identifies unique slides in video screenshots.

Uses Structural Similarity Index (SSIM) and histogram comparison to
detect significant visual changes between consecutive frames, keeping
only unique slides and discarding duplicates.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim

from notes_ai.core.config import AppConfig
from notes_ai.core.models import SlideFrame
from notes_ai.utils.logging import get_logger

logger = get_logger("visual.slide_detector")


class SlideDetector:
    """Detects slide transitions and filters duplicate frames."""

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.threshold = config.visual.slide_similarity_threshold

    def detect_unique_slides(
        self,
        slide_frames: list[SlideFrame],
    ) -> list[SlideFrame]:
        """
        Filter a sequence of frames to keep only unique slides.

        Compares each frame with the previous one using SSIM.
        If the similarity drops below the threshold, the frame is considered
        a new slide and kept.

        Args:
            slide_frames: Ordered list of ``SlideFrame`` objects with ``image_path`` set.

        Returns:
            Filtered list containing only unique slides.
        """
        if not slide_frames:
            return []

        unique_slides: list[SlideFrame] = []
        prev_gray: np.ndarray | None = None

        for frame in slide_frames:
            if frame.image_path is None or not frame.image_path.exists():
                continue

            # Load and convert to grayscale
            img = cv2.imread(str(frame.image_path))
            if img is None:
                continue

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Resize to a standard size for consistent comparison
            gray = cv2.resize(gray, (640, 360))

            if prev_gray is None:
                # First frame is always unique
                frame.similarity_score = 0.0
                unique_slides.append(frame)
                prev_gray = gray
                continue

            # Calculate SSIM
            score = ssim(prev_gray, gray)
            frame.similarity_score = score

            if score < self.threshold:
                # Significant visual change — new slide
                unique_slides.append(frame)
                logger.debug(
                    "New slide detected at frame %d (%.1fs) — SSIM=%.3f",
                    frame.frame_index,
                    frame.timestamp_seconds,
                    score,
                )

            prev_gray = gray

        logger.info(
            "Slide detection: %d frames → %d unique slides (threshold=%.2f)",
            len(slide_frames),
            len(unique_slides),
            self.threshold,
        )
        return unique_slides

    def compute_similarity(
        self,
        frame_a: np.ndarray,
        frame_b: np.ndarray,
    ) -> float:
        """
        Compute the SSIM between two frames.

        Args:
            frame_a: First frame (BGR or grayscale).
            frame_b: Second frame (BGR or grayscale).

        Returns:
            SSIM score between 0.0 (completely different) and 1.0 (identical).
        """
        # Ensure grayscale
        if len(frame_a.shape) == 3:
            frame_a = cv2.cvtColor(frame_a, cv2.COLOR_BGR2GRAY)
        if len(frame_b.shape) == 3:
            frame_b = cv2.cvtColor(frame_b, cv2.COLOR_BGR2GRAY)

        # Resize to same dimensions
        h = min(frame_a.shape[0], frame_b.shape[0])
        w = min(frame_a.shape[1], frame_b.shape[1])
        frame_a = cv2.resize(frame_a, (w, h))
        frame_b = cv2.resize(frame_b, (w, h))

        return float(ssim(frame_a, frame_b))

    def compute_histogram_diff(
        self,
        frame_a: np.ndarray,
        frame_b: np.ndarray,
    ) -> float:
        """
        Compute histogram correlation between two frames.

        Used as a secondary signal alongside SSIM.

        Args:
            frame_a: First frame (BGR).
            frame_b: Second frame (BGR).

        Returns:
            Correlation value. 1.0 = identical, lower = more different.
        """
        # Convert to HSV for better color comparison
        if len(frame_a.shape) == 3:
            hsv_a = cv2.cvtColor(frame_a, cv2.COLOR_BGR2HSV)
            hsv_b = cv2.cvtColor(frame_b, cv2.COLOR_BGR2HSV)
        else:
            hsv_a = frame_a
            hsv_b = frame_b

        # Calculate histograms
        hist_a = cv2.calcHist([hsv_a], [0, 1], None, [50, 60], [0, 180, 0, 256])
        hist_b = cv2.calcHist([hsv_b], [0, 1], None, [50, 60], [0, 180, 0, 256])

        # Normalize
        cv2.normalize(hist_a, hist_a, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist_b, hist_b, 0, 1, cv2.NORM_MINMAX)

        # Compare
        return float(cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_CORREL))

    def deduplicate_slides(
        self,
        slides: list[SlideFrame],
        dedup_threshold: float = 0.95,
    ) -> list[SlideFrame]:
        """
        Remove near-duplicate slides that slipped through initial detection.

        Performs a second pass with a higher similarity threshold.

        Args:
            slides: List of slides (already filtered once).
            dedup_threshold: SSIM threshold for deduplication (higher = stricter).

        Returns:
            Deduplicated slide list.
        """
        if len(slides) <= 1:
            return slides

        deduped: list[SlideFrame] = [slides[0]]

        for slide in slides[1:]:
            if slide.image_path is None or not slide.image_path.exists():
                continue

            is_dup = False
            current_img = cv2.imread(str(slide.image_path))
            if current_img is None:
                continue

            current_gray = cv2.cvtColor(current_img, cv2.COLOR_BGR2GRAY)
            current_gray = cv2.resize(current_gray, (640, 360))

            # Compare against all kept slides (not just previous)
            for kept in deduped[-5:]:  # Check last 5 to avoid O(n²)
                if kept.image_path is None or not kept.image_path.exists():
                    continue

                kept_img = cv2.imread(str(kept.image_path))
                if kept_img is None:
                    continue

                kept_gray = cv2.cvtColor(kept_img, cv2.COLOR_BGR2GRAY)
                kept_gray = cv2.resize(kept_gray, (640, 360))

                score = ssim(current_gray, kept_gray)
                if score >= dedup_threshold:
                    is_dup = True
                    break

            if not is_dup:
                deduped.append(slide)

        removed = len(slides) - len(deduped)
        if removed > 0:
            logger.info("Deduplication removed %d near-duplicate slides", removed)

        return deduped
