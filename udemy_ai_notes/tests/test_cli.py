"""Tests for the Typer CLI application."""

from __future__ import annotations

from typer.testing import CliRunner

from notes_ai.cli.app import app

runner = CliRunner()


class TestCLI:
    """Test suite for CLI commands."""

    def test_version(self) -> None:
        """--version should print the version and exit."""
        result = runner.invoke(app, ["--version"])
        assert result.exit_code == 0
        assert "notes-ai" in result.stdout
        assert "1.0.0" in result.stdout

    def test_help(self) -> None:
        """--help should display available commands."""
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "login" in result.stdout
        assert "scan" in result.stdout
        assert "process" in result.stdout
        assert "resume" in result.stdout
        assert "status" in result.stdout

    def test_config_command(self) -> None:
        """config --show should display configuration."""
        result = runner.invoke(app, ["config", "--show"])
        assert result.exit_code == 0
        assert "Configuration" in result.stdout

    def test_status_no_courses(self) -> None:
        """status should handle empty database gracefully."""
        result = runner.invoke(app, ["status"])
        assert result.exit_code == 0

    def test_clean_no_args(self) -> None:
        """clean with no flags should show usage hint."""
        result = runner.invoke(app, ["clean"])
        assert result.exit_code == 0
        assert "Nothing to clean" in result.stdout
