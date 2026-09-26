"""Tests for configuration loading and validation."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from notes_ai.core.config import AppConfig, load_config, save_config
from notes_ai.core.models import CaptureMethod, LLMProvider, OCREngine


class TestAppConfig:
    """Test configuration model validation."""

    def test_defaults(self) -> None:
        """Default config should have valid values."""
        config = AppConfig()
        assert config.general.output_dir == "./output"
        assert config.general.language == "en"
        assert config.browser.headless is False
        assert config.transcription.model_size == "base"
        assert config.ai.provider == LLMProvider.OPENAI
        assert config.visual.ocr_engine == OCREngine.EASYOCR

    def test_output_path(self) -> None:
        """output_path property should return a resolved Path."""
        config = AppConfig()
        assert isinstance(config.output_path, Path)
        assert config.output_path.is_absolute()

    def test_browser_data_path(self) -> None:
        """browser_data_path should return a resolved Path."""
        config = AppConfig()
        assert isinstance(config.browser_data_path, Path)

    def test_custom_values(self) -> None:
        """Config should accept custom values."""
        config = AppConfig(
            general={"output_dir": "/tmp/notes", "language": "es"},
            ai={"provider": "google", "model": "gemini-pro"},
            transcription={"model_size": "large-v3"},
        )
        assert config.general.output_dir == "/tmp/notes"
        assert config.general.language == "es"
        assert config.ai.provider == LLMProvider.GOOGLE
        assert config.ai.model == "gemini-pro"
        assert config.transcription.model_size == "large-v3"

    def test_audio_capture_method(self) -> None:
        """Audio capture method should validate."""
        config = AppConfig(audio={"capture_method": "loopback"})
        assert config.audio.capture_method == CaptureMethod.LOOPBACK


class TestConfigIO:
    """Test config save/load operations."""

    def test_save_and_load(self, tmp_dir: Path) -> None:
        """Config should survive a save/load roundtrip."""
        config = AppConfig(
            general={"output_dir": str(tmp_dir / "output")},
            ai={"temperature": 0.7, "model": "gpt-4o-mini"},
        )

        config_path = tmp_dir / "test_config.yaml"
        save_config(config, config_path)

        loaded = load_config(config_path)
        assert loaded.general.output_dir == str(tmp_dir / "output")
        assert loaded.ai.temperature == 0.7
        assert loaded.ai.model == "gpt-4o-mini"

    def test_load_missing_file(self, tmp_dir: Path) -> None:
        """Loading a missing config file should return defaults."""
        config = load_config(tmp_dir / "nonexistent.yaml")
        assert isinstance(config, AppConfig)
        assert config.general.output_dir == "./output"

    def test_load_partial_config(self, tmp_dir: Path) -> None:
        """Loading a partial config should use defaults for missing fields."""
        config_path = tmp_dir / "partial.yaml"
        with open(config_path, "w") as f:
            yaml.dump({"ai": {"model": "custom-model"}}, f)

        config = load_config(config_path)
        assert config.ai.model == "custom-model"
        assert config.ai.temperature == 0.3  # default
        assert config.general.language == "en"  # default
