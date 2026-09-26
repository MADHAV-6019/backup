"""
Audio processor — normalizes, cleans, and chunks audio files.

Handles the pre-processing pipeline before transcription:
volume normalization, silence removal, and chunking.
"""

from __future__ import annotations

from pathlib import Path

from pydub import AudioSegment
from pydub.silence import detect_nonsilent

from notes_ai.core.config import AppConfig
from notes_ai.utils.helpers import ensure_dir
from notes_ai.utils.logging import get_logger

logger = get_logger("audio.processor")


class AudioProcessor:
    """Pre-processes audio files for optimal transcription quality."""

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.audio_cfg = config.audio

    def process(self, input_path: Path, output_dir: Path) -> list[Path]:
        """
        Full audio processing pipeline: normalize → remove silence → chunk.

        Args:
            input_path: Path to the raw audio file (WAV).
            output_dir: Directory to save processed chunks.

        Returns:
            List of paths to processed audio chunks.
        """
        ensure_dir(output_dir)
        logger.info("Processing audio: %s", input_path)

        # Load audio
        audio = AudioSegment.from_file(str(input_path))
        logger.debug("Loaded audio: %.1fs, %d channels, %d Hz",
                      len(audio) / 1000, audio.channels, audio.frame_rate)

        # Convert to mono
        if audio.channels > 1:
            audio = audio.set_channels(1)

        # Set sample rate
        audio = audio.set_frame_rate(self.audio_cfg.sample_rate)

        # Normalize volume
        if self.audio_cfg.normalize:
            audio = self._normalize(audio)

        # Remove silence
        if self.audio_cfg.remove_silence:
            audio = self._remove_silence(audio)

        # Chunk
        chunks = self._chunk_audio(audio, output_dir)

        logger.info("Processed %d audio chunks", len(chunks))
        return chunks

    def _normalize(self, audio: AudioSegment, target_dbfs: float = -20.0) -> AudioSegment:
        """
        Normalize audio volume to a target dBFS level.

        Args:
            audio: Input audio segment.
            target_dbfs: Target loudness in dBFS.

        Returns:
            Volume-normalized audio.
        """
        change_in_dbfs = target_dbfs - audio.dBFS
        normalized = audio.apply_gain(change_in_dbfs)
        logger.debug("Normalized audio by %.1f dB", change_in_dbfs)
        return normalized

    def _remove_silence(
        self,
        audio: AudioSegment,
        min_silence_ms: int = 700,
        padding_ms: int = 300,
    ) -> AudioSegment:
        """
        Remove long silent sections from audio.

        Args:
            audio: Input audio segment.
            min_silence_ms: Minimum silence duration to detect (ms).
            padding_ms: Padding to keep around speech (ms).

        Returns:
            Audio with long silences removed.
        """
        threshold = self.audio_cfg.silence_threshold_db

        nonsilent_ranges = detect_nonsilent(
            audio,
            min_silence_len=min_silence_ms,
            silence_thresh=threshold,
        )

        if not nonsilent_ranges:
            logger.warning("Entire audio appears silent")
            return audio

        # Combine non-silent ranges with padding
        combined = AudioSegment.empty()
        for start, end in nonsilent_ranges:
            start = max(0, start - padding_ms)
            end = min(len(audio), end + padding_ms)
            combined += audio[start:end]

        original_dur = len(audio) / 1000
        new_dur = len(combined) / 1000
        logger.debug(
            "Silence removal: %.1fs → %.1fs (removed %.1fs)",
            original_dur, new_dur, original_dur - new_dur,
        )
        return combined

    def _chunk_audio(self, audio: AudioSegment, output_dir: Path) -> list[Path]:
        """
        Split audio into chunks of a configured duration.

        Args:
            audio: Processed audio segment.
            output_dir: Directory to save chunks.

        Returns:
            List of paths to chunk files.
        """
        chunk_ms = self.audio_cfg.chunk_duration_seconds * 1000
        chunks: list[Path] = []

        total_ms = len(audio)
        if total_ms <= chunk_ms:
            # Single chunk — no splitting needed
            path = output_dir / "chunk_000.wav"
            audio.export(str(path), format="wav")
            chunks.append(path)
            return chunks

        # Split into chunks
        for i, start_ms in enumerate(range(0, total_ms, chunk_ms)):
            end_ms = min(start_ms + chunk_ms, total_ms)
            chunk = audio[start_ms:end_ms]

            path = output_dir / f"chunk_{i:03d}.wav"
            chunk.export(str(path), format="wav")
            chunks.append(path)

        return chunks

    def convert_to_wav(self, input_path: Path, output_path: Path) -> Path:
        """
        Convert any audio format to WAV (16kHz mono).

        Args:
            input_path: Source audio file.
            output_path: Destination WAV file.

        Returns:
            Path to the converted file.
        """
        ensure_dir(output_path.parent)
        audio = AudioSegment.from_file(str(input_path))
        audio = audio.set_channels(1).set_frame_rate(self.audio_cfg.sample_rate)
        audio.export(str(output_path), format="wav")
        return output_path
