"""
Rich-powered logging setup for the notes-ai CLI.

Provides a pre-configured logger with:
- Rich console handler (colored, formatted output)
- File handler for persistent logs
- Configurable log level
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.logging import RichHandler
from rich.theme import Theme

# ---------------------------------------------------------------------------
# Console / Theme
# ---------------------------------------------------------------------------

CUSTOM_THEME = Theme(
    {
        "info": "cyan",
        "warning": "yellow",
        "error": "bold red",
        "success": "bold green",
        "progress": "magenta",
        "heading": "bold blue",
    }
)

console = Console(theme=CUSTOM_THEME)

# ---------------------------------------------------------------------------
# Logger setup
# ---------------------------------------------------------------------------

_LOG_FORMAT = "%(message)s"
_FILE_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"


def setup_logging(
    level: str = "INFO",
    log_file: Optional[Path] = None,
) -> logging.Logger:
    """
    Configure and return the application root logger.

    Args:
        level: Logging level string (DEBUG, INFO, WARNING, ERROR).
        log_file: Optional path for a persistent log file.

    Returns:
        Configured ``logging.Logger`` for ``notes_ai``.
    """
    log_level = getattr(logging, level.upper(), logging.INFO)

    # Root logger for the package
    logger = logging.getLogger("notes_ai")
    logger.setLevel(log_level)

    # Clear existing handlers to avoid duplicates on re-init
    logger.handlers.clear()

    # Rich console handler
    rich_handler = RichHandler(
        console=console,
        show_time=True,
        show_path=False,
        markup=True,
        rich_tracebacks=True,
        tracebacks_show_locals=True,
    )
    rich_handler.setLevel(log_level)
    rich_handler.setFormatter(logging.Formatter(_LOG_FORMAT))
    logger.addHandler(rich_handler)

    # Optional file handler
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(str(log_file), encoding="utf-8")
        file_handler.setLevel(logging.DEBUG)  # Always capture DEBUG in file
        file_handler.setFormatter(logging.Formatter(_FILE_FORMAT))
        logger.addHandler(file_handler)

    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a child logger for a specific module.

    Args:
        name: Module or component name (e.g. ``browser.session``).

    Returns:
        Child ``logging.Logger`` under the ``notes_ai`` namespace.
    """
    return logging.getLogger(f"notes_ai.{name}")
