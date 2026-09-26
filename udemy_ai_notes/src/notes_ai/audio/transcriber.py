"""
Faster-Whisper transcription engine.

Transcribes audio chunks using the CTranslate2 Whisper implementation
for fast, accurate speech-to-text conversion.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from notes_ai.core.config import AppConfig
from notes_ai.core.models import Transcript, TranscriptSegment
from notes_ai.utils.logging import get_logger

logger = get_logger("audio.transcriber")


class Transcriber:
    """
    Transcribes audio files using Faster-Whisper.

    Automatically detects GPU availability and selects the optimal
    compute type for performance.
    """

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.trans_cfg = config.transcription
        self._model = None

    def _get_device_and_compute(self) -> tuple[str, str]:
        """
        Determine the best device and compute type.

        Returns:
            Tuple of (device, compute_type).
        """
        device = self.trans_cfg.device
        compute_type = self.trans_cfg.compute_type

        if device == "auto" or compute_type == "auto":
            try:
                import torch
                if torch.cuda.is_available():
                    device = "cuda"
                    compute_type = "float16"
                    logger.info("GPU detected — using CUDA with float16")
                else:
                    device = "cpu"
                    compute_type = "int8"
                    logger.info("No GPU — using CPU with int8 quantization")
            except ImportError:
                device = "cpu"
                compute_type = "int8"
                logger.info("torch not installed — using CPU with int8")

        return device, compute_type

    def _load_model(self) -> None:
        """Load the Whisper model (lazy initialization)."""
        if self._model is not None:
            return

        from faster_whisper import WhisperModel

        device, compute_type = self._get_device_and_compute()

        logger.info(
            "Loading Whisper model '%s' on %s (%s)...",
            self.trans_cfg.model_size,
            device,
            compute_type,
        )

        self._model = WhisperModel(
            self.trans_cfg.model_size,
            device=device,
            compute_type=compute_type,
        )

        logger.info("Whisper model loaded successfully")

    def transcribe_file(self, audio_path: Path) -> Transcript:
        """
        Transcribe a single audio file.

        Args:
            audio_path: Path to a WAV audio file.

        Returns:
            Populated ``Transcript`` with timed segments.
        """
        self._load_model()

        logger.info("Transcribing: %s", audio_path.name)

        segments_gen, info = self._model.transcribe(
            str(audio_path),
            beam_size=self.trans_cfg.beam_size,
            vad_filter=self.trans_cfg.vad_filter,
            language=self.config.general.language if self.config.general.language != "auto" else None,
        )

        segments: list[TranscriptSegment] = []
        for seg in segments_gen:
            if seg.text.strip():
                segments.append(TranscriptSegment(
                    start=seg.start,
                    end=seg.end,
                    text=seg.text.strip(),
                    confidence=seg.avg_logprob if hasattr(seg, "avg_logprob") else 0.0,
                ))

        duration = segments[-1].end if segments else 0.0

        transcript = Transcript(
            segments=segments,
            language=info.language,
            language_probability=info.language_probability,
            duration_seconds=duration,
        )

        logger.info(
            "Transcribed %d segments, language=%s (%.0f%% confidence), duration=%.0fs",
            len(segments),
            info.language,
            info.language_probability * 100,
            duration,
        )

        return transcript

    def transcribe_chunks(self, chunk_paths: list[Path]) -> Transcript:
        """
        Transcribe multiple audio chunks and merge into a single transcript.

        Handles time offset correction so timestamps are continuous.

        Args:
            chunk_paths: Ordered list of audio chunk file paths.

        Returns:
            Merged ``Transcript`` with continuous timestamps.
        """
        self._load_model()

        all_segments: list[TranscriptSegment] = []
        time_offset = 0.0
        total_language_prob = 0.0
        detected_language = "en"

        for i, chunk_path in enumerate(chunk_paths):
            logger.info("Transcribing chunk %d/%d: %s", i + 1, len(chunk_paths), chunk_path.name)

            segments_gen, info = self._model.transcribe(
                str(chunk_path),
                beam_size=self.trans_cfg.beam_size,
                vad_filter=self.trans_cfg.vad_filter,
            )

            chunk_duration = 0.0
            for seg in segments_gen:
                if seg.text.strip():
                    all_segments.append(TranscriptSegment(
                        start=seg.start + time_offset,
                        end=seg.end + time_offset,
                        text=seg.text.strip(),
                        confidence=seg.avg_logprob if hasattr(seg, "avg_logprob") else 0.0,
                    ))
                    chunk_duration = max(chunk_duration, seg.end)

            time_offset += chunk_duration
            total_language_prob += info.language_probability
            detected_language = info.language

        avg_lang_prob = total_language_prob / max(len(chunk_paths), 1)

        transcript = Transcript(
            segments=all_segments,
            language=detected_language,
            language_probability=avg_lang_prob,
            duration_seconds=time_offset,
        )

        logger.info(
            "Merged transcript: %d total segments, %.0fs total duration",
            len(all_segments),
            time_offset,
        )
        return transcript

    def filter_low_confidence(
        self,
        transcript: Transcript,
        min_confidence: Optional[float] = None,
    ) -> Transcript:
        """
        Remove segments below a confidence threshold.

        Args:
            transcript: Input transcript.
            min_confidence: Minimum confidence to keep. Defaults to config value.

        Returns:
            Filtered transcript.
        """
        threshold = min_confidence or self.trans_cfg.min_confidence

        filtered = [s for s in transcript.segments if s.confidence >= threshold]

        logger.debug(
            "Confidence filter: %d → %d segments (threshold=%.2f)",
            len(transcript.segments),
            len(filtered),
            threshold,
        )

        return Transcript(
            segments=filtered,
            language=transcript.language,
            language_probability=transcript.language_probability,
            duration_seconds=transcript.duration_seconds,
        )
