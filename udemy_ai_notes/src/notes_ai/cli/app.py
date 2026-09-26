"""
Typer CLI application — the main user-facing interface for notes-ai.

Commands:
    login    — Open browser for manual Udemy login
    scan     — Scan a course's curriculum
    process  — Process lectures and generate notes
    resume   — Resume from last checkpoint
    export   — Re-export notes in a different format
    config   — Show or edit configuration
    clean    — Remove cached/temp files
    status   — Show processing progress
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Annotated, Optional
import dotenv

dotenv.load_dotenv()

import typer
from rich import print as rprint
from rich.panel import Panel
from rich.table import Table

from notes_ai import __version__
from notes_ai.core.config import AppConfig, load_config, save_config
from notes_ai.core.database import Database
from notes_ai.core.models import ProcessingStatus
from notes_ai.utils.logging import console, setup_logging

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = typer.Typer(
    name="notes-ai",
    help="🎓 AI-Powered Udemy Course Note Generator — Convert lectures into study notes.",
    rich_markup_mode="rich",
    no_args_is_help=True,
    add_completion=False,
)


def _get_config() -> AppConfig:
    """Load configuration with environment variable override support."""
    import os
    config_path_str = os.environ.get("NOTES_AI_CONFIG")
    config_path = Path(config_path_str) if config_path_str else None
    return load_config(config_path)


def _get_db(config: AppConfig) -> Database:
    """Get a database instance using the configured output directory."""
    db_path = config.output_path / ".notes_ai.db"
    return Database(db_path)


def _version_callback(value: bool) -> None:
    """Print version and exit."""
    if value:
        rprint(f"[bold cyan]notes-ai[/] v{__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: Annotated[
        Optional[bool],
        typer.Option("--version", "-v", help="Show version and exit.", callback=_version_callback, is_eager=True),
    ] = None,
) -> None:
    """🎓 AI-Powered Udemy Course Note Generator."""
    pass


# ---------------------------------------------------------------------------
# LOGIN
# ---------------------------------------------------------------------------

@app.command()
def login() -> None:
    """
    🔐 Open a browser window for manual Udemy login.

    The session is saved so you don't need to log in again.
    """
    config = _get_config()
    logger = setup_logging(config.general.log_level)

    rprint(Panel(
        "[bold]Opening browser for Udemy login...[/]\n\n"
        "1. Log into your Udemy account in the browser window\n"
        "2. Once logged in, close the browser or press [bold cyan]Ctrl+C[/]\n"
        "3. Your session will be saved for future use",
        title="🔐 Udemy Login",
        border_style="cyan",
    ))

    from notes_ai.browser.session import BrowserSession

    async def _login() -> None:
        async with BrowserSession(config) as session:
            await session.interactive_login()

    asyncio.run(_login())
    rprint("[bold green]✓[/] Session saved successfully!")


# ---------------------------------------------------------------------------
# SCAN
# ---------------------------------------------------------------------------

@app.command()
def scan(
    course_url: Annotated[
        Optional[str], typer.Argument(help="Udemy course URL to scan")
    ] = None,
) -> None:
    """
    🔍 Scan a course and display its curriculum.

    This detects all sections, lectures, durations, and content types.
    """
    config = _get_config()
    logger = setup_logging(config.general.log_level)

    from notes_ai.browser.course_scanner import CourseScanner
    from notes_ai.browser.session import BrowserSession
    import questionary

    async def _scan() -> None:
        nonlocal course_url
        async with BrowserSession(config) as session:
            scanner = CourseScanner(session)
            
            if not course_url:
                courses = await scanner.get_enrolled_courses()
                if not courses:
                    rprint("[red]No courses found or failed to load. Please provide a URL.[/]")
                    return
                
                course_title = await questionary.select(
                    "Select a course to scan:",
                    choices=list(courses.keys())
                ).ask_async()
                
                if not course_title:
                    return
                course_url = courses[course_title]

            rprint(f"\n[bold cyan]Scanning course:[/] {course_url}\n")
            course = await scanner.scan_course(course_url)

            # Save to database
            db = _get_db(config)
            db.save_course(
                url=course.url,
                title=course.title,
                instructor=course.instructor,
                total_lectures=course.total_lectures,
                total_duration=course.total_duration_seconds,
                data_json=course.model_dump_json(),
            )
            for lecture in course.all_lectures:
                db.save_lecture(
                    course_url=course.url,
                    lecture_index=lecture.index,
                    title=lecture.title,
                    section_title=lecture.section_title,
                    duration=lecture.duration_seconds,
                    content_type=lecture.content_type,
                )
            db.close()

            # Display results
            _display_course_table(course)

    asyncio.run(_scan())


def _display_course_table(course: "Course") -> None:
    """Render a rich table showing the course curriculum."""
    from notes_ai.utils.helpers import format_duration

    rprint(Panel(
        f"[bold]{course.title}[/]\n"
        f"Instructor: {course.instructor or 'N/A'}\n"
        f"Lectures: {course.total_lectures} | "
        f"Duration: {format_duration(course.total_duration_seconds)}",
        title="📚 Course Info",
        border_style="green",
    ))

    table = Table(title="Curriculum", show_lines=True)
    table.add_column("#", style="dim", width=5)
    table.add_column("Section", style="cyan", max_width=30)
    table.add_column("Lecture", style="white", max_width=50)
    table.add_column("Duration", justify="right", style="green")
    table.add_column("Type", justify="center", style="magenta")

    from notes_ai.utils.helpers import format_duration as fmt_dur

    for section in course.sections:
        for lecture in section.lectures:
            table.add_row(
                str(lecture.index),
                section.title,
                lecture.title,
                fmt_dur(lecture.duration_seconds),
                lecture.content_type,
            )

    console.print(table)


# ---------------------------------------------------------------------------
# PROCESS
# ---------------------------------------------------------------------------

@app.command()
def process(
    course_url: Annotated[
        Optional[str], typer.Argument(help="Udemy course URL to process")
    ] = None,
    lecture: Annotated[
        Optional[int],
        typer.Option("--lecture", "-l", help="Process only a specific lecture number"),
    ] = None,
    skip_completed: Annotated[
        bool,
        typer.Option("--skip-completed", help="Skip lectures already completed on Udemy"),
    ] = False,
    start_from: Annotated[
        Optional[int],
        typer.Option("--start-from", "-s", help="Start from a specific lecture number"),
    ] = None,
    start_section: Annotated[
        Optional[int],
        typer.Option("--start-section", help="Start from the first lecture of a specific section number"),
    ] = None,
) -> None:
    """
    🚀 Process lectures and generate AI-powered study notes.

    Processes all lectures by default, or use --lecture N for a single one.
    """
    config = _get_config()
    logger = setup_logging(config.general.log_level)

    from notes_ai.core.orchestrator import Orchestrator
    from notes_ai.browser.course_scanner import CourseScanner
    from notes_ai.browser.session import BrowserSession
    import questionary

    async def _process() -> None:
        nonlocal course_url
        if not course_url:
            async with BrowserSession(config) as session:
                scanner = CourseScanner(session)
                courses = await scanner.get_enrolled_courses()
                if not courses:
                    rprint("[red]No courses found or failed to load. Please provide a URL.[/]")
                    return
                
                course_title = await questionary.select(
                    "Select a course to process:",
                    choices=list(courses.keys())
                ).ask_async()
                
                if not course_title:
                    return
                course_url = courses[course_title]

        rprint(Panel(
            f"[bold]Processing course:[/] {course_url}\n"
            + (f"Lecture: #{lecture}" if lecture else "All lectures")
            + (f"\nStarting from: #{start_from}" if start_from else ""),
            title="🚀 Processing",
            border_style="green",
        ))

        orchestrator = Orchestrator(config)
        await orchestrator.process_course(
            course_url=course_url,
            single_lecture=lecture,
            skip_completed=skip_completed,
            start_from=start_from,
            start_section=start_section,
        )

    asyncio.run(_process())
    rprint("[bold green]✓[/] Processing complete!")


# ---------------------------------------------------------------------------
# RESUME
# ---------------------------------------------------------------------------

@app.command()
def resume(
    course_url: Annotated[
        Optional[str],
        typer.Argument(help="Course URL to resume (auto-detects if only one)"),
    ] = None,
) -> None:
    """
    ▶️  Resume processing from the last checkpoint.

    Automatically picks up where the last run left off.
    """
    config = _get_config()
    logger = setup_logging(config.general.log_level)

    db = _get_db(config)

    if not course_url:
        # Auto-detect: find the most recent incomplete course
        all_progress = db.get_all_progress()
        incomplete = [p for p in all_progress if p.pending_lectures > 0]
        if not incomplete:
            rprint("[yellow]No incomplete courses found.[/]")
            db.close()
            raise typer.Exit()
        course_url = incomplete[0].course_url
        rprint(f"[dim]Auto-detected course:[/] {course_url}")

    progress = db.get_progress(course_url)
    db.close()

    if not progress:
        rprint("[red]No progress data found for this course. Run 'scan' first.[/]")
        raise typer.Exit(code=1)

    rprint(Panel(
        f"[bold]Resuming:[/] {progress.course_title}\n"
        f"Progress: {progress.completed_lectures}/{progress.total_lectures} "
        f"({progress.progress_percent:.0f}%)\n"
        f"Starting from lecture #{progress.last_processed_index + 1}",
        title="▶️  Resume",
        border_style="yellow",
    ))

    from notes_ai.core.orchestrator import Orchestrator

    async def _resume() -> None:
        orchestrator = Orchestrator(config)
        await orchestrator.process_course(
            course_url=course_url,
            start_from=progress.last_processed_index + 1,
        )

    asyncio.run(_resume())
    rprint("[bold green]✓[/] Resume complete!")


# ---------------------------------------------------------------------------
# EXPORT
# ---------------------------------------------------------------------------

@app.command()
def export(
    course_url: Annotated[str, typer.Argument(help="Course URL to export notes for")],
    format: Annotated[
        str,
        typer.Option("--format", "-f", help="Export format: markdown, pdf, or both"),
    ] = "both",
) -> None:
    """
    📄 Re-export existing notes in a different format.

    Useful for regenerating PDFs after changing the theme.
    """
    config = _get_config()
    logger = setup_logging(config.general.log_level)

    rprint(f"[cyan]Exporting notes for:[/] {course_url}")
    rprint(f"[cyan]Format:[/] {format}")

    from notes_ai.core.orchestrator import Orchestrator

    async def _export() -> None:
        orchestrator = Orchestrator(config)
        await orchestrator.export_course(course_url, format)

    asyncio.run(_export())
    rprint("[bold green]✓[/] Export complete!")


# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

@app.command()
def config(
    show: Annotated[
        bool,
        typer.Option("--show", help="Display current configuration"),
    ] = True,
) -> None:
    """
    ⚙️  Show or edit the current configuration.
    """
    cfg = _get_config()

    table = Table(title="⚙️  Current Configuration", show_lines=True)
    table.add_column("Section", style="cyan", width=15)
    table.add_column("Setting", style="white", width=30)
    table.add_column("Value", style="green", width=40)

    for section_name in [
        "general", "browser", "audio", "transcription",
        "visual", "ai", "export", "performance",
    ]:
        section = getattr(cfg, section_name)
        for field_name, value in section.model_dump().items():
            table.add_row(section_name, field_name, str(value))

    console.print(table)
    rprint(f"\n[dim]Config file: {cfg.__class__.__name__} loaded from config.yaml[/]")


# ---------------------------------------------------------------------------
# CLEAN
# ---------------------------------------------------------------------------

@app.command()
def clean(
    cache: Annotated[bool, typer.Option("--cache", help="Remove model cache")] = False,
    browser: Annotated[bool, typer.Option("--browser", help="Remove browser session data")] = False,
    all_data: Annotated[bool, typer.Option("--all", help="Remove everything (output + cache + browser)")] = False,
) -> None:
    """
    🧹 Remove cached/temporary files.
    """
    import shutil

    cfg = _get_config()
    removed: list[str] = []

    if all_data or cache:
        models_dir = Path("./models")
        if models_dir.exists():
            shutil.rmtree(models_dir)
            removed.append("Model cache")

    if all_data or browser:
        browser_dir = cfg.browser_data_path
        if browser_dir.exists():
            shutil.rmtree(browser_dir)
            removed.append("Browser session data")

    if all_data:
        output_dir = cfg.output_path
        if output_dir.exists():
            shutil.rmtree(output_dir)
            removed.append("Output directory")

    if removed:
        for item in removed:
            rprint(f"  [red]✗[/] Removed: {item}")
        rprint("[bold green]✓[/] Cleanup complete!")
    else:
        rprint("[yellow]Nothing to clean. Use --cache, --browser, or --all.[/]")


# ---------------------------------------------------------------------------
# STATUS
# ---------------------------------------------------------------------------

@app.command()
def status() -> None:
    """
    📊 Show processing progress for all courses.
    """
    cfg = _get_config()
    db = _get_db(cfg)
    all_progress = db.get_all_progress()
    db.close()

    if not all_progress:
        rprint("[yellow]No courses found. Run 'scan' on a course first.[/]")
        return

    table = Table(title="📊 Processing Status", show_lines=True)
    table.add_column("Course", style="white", max_width=40)
    table.add_column("Progress", justify="center", style="cyan")
    table.add_column("Completed", justify="right", style="green")
    table.add_column("Failed", justify="right", style="red")
    table.add_column("Pending", justify="right", style="yellow")
    table.add_column("Last Updated", style="dim")

    for prog in all_progress:
        bar_len = 20
        filled = int(bar_len * prog.progress_percent / 100)
        bar = "█" * filled + "░" * (bar_len - filled)

        table.add_row(
            prog.course_title,
            f"{bar} {prog.progress_percent:.0f}%",
            str(prog.completed_lectures),
            str(prog.failed_lectures),
            str(prog.pending_lectures),
            prog.updated_at.strftime("%Y-%m-%d %H:%M") if prog.updated_at else "N/A",
        )

    console.print(table)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app()
