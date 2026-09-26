"""
Application configuration — loads from config.yaml + environment variables.

Uses Pydantic BaseModel for validation and type safety.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import yaml
from pydantic import BaseModel, Field

from notes_ai.core.models import CaptureMethod, LLMProvider, OCREngine

# ---------------------------------------------------------------------------
# Default paths
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parents[3]  # → udemy_ai_notes/
DEFAULT_CONFIG_PATH = _PROJECT_ROOT / "config.yaml"


# ---------------------------------------------------------------------------
# Config Sections
# ---------------------------------------------------------------------------

class GeneralConfig(BaseModel):
    """General application settings."""
    output_dir: str = "./output"
    language: str = "en"
    log_level: str = "INFO"
    max_retries: int = 3
    retry_delay_seconds: int = 5


class BrowserConfig(BaseModel):
    """Playwright browser settings."""
    headless: bool = False
    user_data_dir: str = "./browser_data"
    viewport_width: int = 1920
    viewport_height: int = 1080
    timeout_ms: int = 30000
    slow_mo_ms: int = 100


class AudioConfig(BaseModel):
    """Audio capture and processing settings."""
    capture_method: CaptureMethod = CaptureMethod.CAPTIONS
    chunk_duration_seconds: int = 30
    sample_rate: int = 16000
    normalize: bool = True
    remove_silence: bool = True
    silence_threshold_db: int = -40


class TranscriptionConfig(BaseModel):
    """Faster-Whisper transcription settings."""
    model_size: str = "base"
    device: str = "auto"
    compute_type: str = "auto"
    beam_size: int = 5
    vad_filter: bool = True
    min_confidence: float = 0.4


class VisualConfig(BaseModel):
    """Screenshot, OCR, and slide detection settings."""
    screenshot_interval_seconds: int = 5
    ocr_engine: OCREngine = OCREngine.EASYOCR
    ocr_confidence_threshold: float = 0.5
    slide_similarity_threshold: float = 0.85
    max_screenshots_per_lecture: int = 200
    image_quality: int = 90
    crop_video_player: bool = True


class AIConfig(BaseModel):
    """LLM note generation settings."""
    provider: LLMProvider = LLMProvider.OPENAI
    model: str = "gpt-4o"
    temperature: float = 0.3
    max_tokens: int = 16000
    chunk_size: int = 4000
    chunk_overlap: int = 200
    generate_quiz: bool = True
    generate_flashcards: bool = True
    quiz_count: int = 10
    flashcard_count: int = 15


class ExportConfig(BaseModel):
    """Note export settings."""
    formats: list[str] = Field(default_factory=lambda: ["markdown", "pdf"])
    pdf_theme: str = "professional"
    code_theme: str = "monokai"
    embed_screenshots: bool = True
    table_of_contents: bool = True


class PerformanceConfig(BaseModel):
    """Performance tuning settings."""
    max_concurrent_ocr: int = 4
    batch_ocr_size: int = 10
    cache_models: bool = True
    gpu_memory_fraction: float = 0.8


# ---------------------------------------------------------------------------
# Root Config
# ---------------------------------------------------------------------------

class AppConfig(BaseModel):
    """Root application configuration — aggregates all sections."""
    general: GeneralConfig = Field(default_factory=GeneralConfig)
    browser: BrowserConfig = Field(default_factory=BrowserConfig)
    audio: AudioConfig = Field(default_factory=AudioConfig)
    transcription: TranscriptionConfig = Field(default_factory=TranscriptionConfig)
    visual: VisualConfig = Field(default_factory=VisualConfig)
    ai: AIConfig = Field(default_factory=AIConfig)
    export: ExportConfig = Field(default_factory=ExportConfig)
    performance: PerformanceConfig = Field(default_factory=PerformanceConfig)

    @property
    def output_path(self) -> Path:
        """Resolved output directory as a Path."""
        return Path(self.general.output_dir).resolve()

    @property
    def browser_data_path(self) -> Path:
        """Resolved browser data directory."""
        return Path(self.browser.user_data_dir).resolve()


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

def load_config(config_path: Optional[Path] = None) -> AppConfig:
    """
    Load configuration from a YAML file.

    Falls back to defaults if the file doesn't exist.

    Args:
        config_path: Path to the YAML configuration file.
                     Defaults to ``config.yaml`` in the project root.

    Returns:
        Validated ``AppConfig`` instance.
    """
    path = config_path or DEFAULT_CONFIG_PATH

    if path.exists():
        with open(path, "r", encoding="utf-8") as fh:
            raw = yaml.safe_load(fh) or {}
        return AppConfig(**raw)

    return AppConfig()


def save_config(config: AppConfig, config_path: Optional[Path] = None) -> None:
    """
    Save configuration to a YAML file.

    Args:
        config: The configuration to persist.
        config_path: Destination path. Defaults to ``config.yaml`` in the project root.
    """
    path = config_path or DEFAULT_CONFIG_PATH
    data = config.model_dump(mode="json")

    with open(path, "w", encoding="utf-8") as fh:
        yaml.dump(data, fh, default_flow_style=False, sort_keys=False, allow_unicode=True)
