"""
Audio capture — obtains audio content from Udemy lectures.

Supports two capture methods:
1. **Captions** (default): Extracts captions from the Udemy transcript panel via DOM
2. **Loopback**: Records system audio output via virtual audio cable (requires driver)
"""

from __future__ import annotations

import asyncio
import wave
from pathlib import Path
from typing import Optional

import numpy as np

from notes_ai.core.config import AppConfig
from notes_ai.core.models import CaptureMethod, TranscriptSegment, Transcript
from notes_ai.utils.helpers import ensure_dir
from notes_ai.utils.logging import get_logger

logger = get_logger("audio.capture")


class AudioCapture:
    """Captures audio content from a Udemy lecture."""

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.audio_config = config.audio

    async def capture_from_captions(
        self, caption_data: list[dict]
    ) -> Transcript:
        """
        Build a Transcript from caption data extracted by LectureNavigator.

        This method converts the raw caption dicts (from DOM scraping)
        into a validated ``Transcript`` model.

        Args:
            caption_data: List of ``{text, start_time}`` dicts from the browser.

        Returns:
            Populated ``Transcript`` with segments.
        """
        segments: list[TranscriptSegment] = []

        for i, entry in enumerate(caption_data):
            text = entry.get("text", "").strip()
            start = float(entry.get("start_time", 0.0))

            # Estimate end time from next segment or add 5 seconds
            if i + 1 < len(caption_data):
                end = float(caption_data[i + 1].get("start_time", start + 5.0))
            else:
                end = start + 5.0

            if text:
                segments.append(TranscriptSegment(
                    start=start,
                    end=end,
                    text=text,
                    confidence=0.95,  # Captions are generally high-confidence
                ))

        duration = segments[-1].end if segments else 0.0

        transcript = Transcript(
            segments=segments,
            language=self.config.general.language,
            language_probability=1.0,
            duration_seconds=duration,
        )

        logger.info(
            "Built transcript from %d caption segments (%.0f seconds)",
            len(segments),
            duration,
        )
        return transcript

    async def capture_loopback_audio(
        self,
        output_path: Path,
        duration_seconds: float,
    ) -> Path | None:
        """
        Record system audio via loopback (requires virtual audio cable).

        This method records from the system's audio output device using
        ``sounddevice``. Requires VB-CABLE or similar virtual audio cable
        driver to be installed.

        Args:
            output_path: Path to save the recorded WAV file.
            duration_seconds: How long to record.

        Returns:
            Path to the recorded WAV file, or None on failure.
        """
        try:
            import sounddevice as sd

            ensure_dir(output_path.parent)
            sample_rate = self.audio_config.sample_rate

            # Find the loopback/virtual audio device
            device_index = self._find_loopback_device()

            if device_index is None:
                logger.error(
                    "No loopback audio device found. "
                    "Install VB-CABLE or similar virtual audio cable, "
                    "or switch to 'captions' capture method in config.yaml"
                )
                return None

            logger.info(
                "Recording audio (%.0fs) from device #%d at %d Hz",
                duration_seconds,
                device_index,
                sample_rate,
            )

            # Record audio
            frames = int(duration_seconds * sample_rate)
            recording = sd.rec(
                frames=frames,
                samplerate=sample_rate,
                channels=1,
                dtype="int16",
                device=device_index,
            )
            sd.wait()

            # Save as WAV
            with wave.open(str(output_path), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(sample_rate)
                wf.writeframes(recording.tobytes())

            logger.info("Audio saved: %s (%.1f MB)", output_path, output_path.stat().st_size / 1e6)
            return output_path

        except ImportError:
            logger.error("sounddevice not installed. Run: pip install sounddevice")
            return None
        except Exception as e:
            logger.error("Audio capture failed: %s", e)
            return None

    def _find_loopback_device(self) -> int | None:
        """
        Detect a virtual audio cable / loopback device.

        Returns:
            Device index for sounddevice, or None if not found.
        """
        try:
            import sounddevice as sd

            devices = sd.query_devices()
            loopback_keywords = [
                "cable output", "vb-audio", "virtual cable",
                "loopback", "stereo mix", "what u hear",
                "wave out mix",
            ]

            for idx, dev in enumerate(devices):
                name = dev.get("name", "").lower()
                if any(kw in name for kw in loopback_keywords):
                    if dev.get("max_input_channels", 0) > 0:
                        logger.debug("Found loopback device: '%s' (index=%d)", dev["name"], idx)
                        return idx

            return None

        except Exception:
            return None
