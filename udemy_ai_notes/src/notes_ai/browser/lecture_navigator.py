"""
Lecture navigator — controls playback and iterates through lectures.

Handles clicking into each lecture, waiting for the video player,
controlling playback, and taking periodic screenshots.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Optional

from playwright.async_api import Page

from notes_ai.browser.session import BrowserSession
from notes_ai.core.config import AppConfig
from notes_ai.core.models import Lecture
from notes_ai.utils.helpers import ensure_dir
from notes_ai.utils.logging import get_logger

logger = get_logger("browser.lecture_navigator")


class LectureNavigator:
    """
    Controls navigation through Udemy lectures.

    Provides methods to open specific lectures, control video playback,
    and capture screenshots of the video player area.
    """

    def __init__(self, session: BrowserSession, config: AppConfig) -> None:
        self.session = session
        self.config = config
        self._current_lecture: Optional[Lecture] = None

    # ------------------------------------------------------------------
    # Navigation
    # ------------------------------------------------------------------

    async def open_lecture(self, lecture: Lecture, course_url: str) -> Page:
        """
        Navigate to a specific lecture within the course.

        Args:
            lecture: The ``Lecture`` to open.
            course_url: Base course URL.

        Returns:
            The page with the lecture loaded.
        """
        page = await self.session.get_page()
        self._current_lecture = lecture

        if lecture.url:
            await page.goto(lecture.url, wait_until="domcontentloaded")
        else:
            # Click on the lecture in the sidebar by index/title
            await self._navigate_via_sidebar(page, lecture)

        # Wait for the video player to be ready
        await self._wait_for_player(page)

        logger.info("Opened lecture #%d: '%s'", lecture.index, lecture.title)
        return page

    async def _navigate_via_sidebar(self, page: Page, lecture: Lecture) -> None:
        """Click the lecture item in the course sidebar."""
        # Try to find the lecture by its title in the sidebar
        sidebar_items = await page.query_selector_all(
            "[data-purpose='curriculum-item-title'], "
            "[data-purpose='curriculum-item'], "
            "li[class*='curriculum-item'], "
            ".section--item-title--EWIuI"
        )

        for item in sidebar_items:
            text = await item.inner_text()
            if text and lecture.title.lower() in text.lower():
                await item.click()
                await page.wait_for_timeout(2000)
                return

        # Fallback: try clicking the Nth item
        all_items = await page.query_selector_all(
            "[data-purpose='curriculum-item-title']"
        )
        if lecture.index - 1 < len(all_items):
            await all_items[lecture.index - 1].click()
            await page.wait_for_timeout(2000)

    async def _wait_for_player(self, page: Page, timeout_ms: int = 15000) -> None:
        """Wait for the video player to become ready."""
        try:
            await page.wait_for_selector(
                "video, [data-purpose='video-player'], "
                "[class*='video-player'], .shaka-video-container",
                timeout=timeout_ms,
            )
            # Give the player a moment to initialize
            await page.wait_for_timeout(1500)
        except Exception:
            logger.warning("Video player not detected — lecture may be an article or quiz")

    # ------------------------------------------------------------------
    # Playback control
    # ------------------------------------------------------------------

    async def play_video(self, page: Page) -> None:
        """Start video playback from the beginning."""
        try:
            # Force video to start at 0:00 so we don't miss screenshots if resumed
            await page.evaluate("""
                () => {
                    const video = document.querySelector('video');
                    if (video) {
                        video.currentTime = 0;
                    }
                }
            """)

            # Try clicking the play button
            play_btn = await page.query_selector(
                "[data-purpose='play-button'], "
                "button[aria-label='Play'], "
                "button[aria-label='play'], "
                "[class*='play-button']"
            )
            if play_btn:
                await play_btn.click()
                await page.wait_for_timeout(500)
                return

            # Fallback: use JavaScript to play the video element
            await page.evaluate("""
                () => {
                    const video = document.querySelector('video');
                    if (video) {
                        video.play();
                        video.muted = false;
                    }
                }
            """)
        except Exception as e:
            logger.debug("Could not auto-play video: %s", e)

    async def pause_video(self, page: Page) -> None:
        """Pause video playback."""
        try:
            await page.evaluate("""
                () => {
                    const video = document.querySelector('video');
                    if (video) video.pause();
                }
            """)
        except Exception as e:
            logger.debug("Could not pause video: %s", e)

    async def get_video_duration(self, page: Page) -> float:
        """Get the total video duration in seconds."""
        try:
            duration = await page.evaluate("""
                () => {
                    const video = document.querySelector('video');
                    return video ? video.duration : 0;
                }
            """)
            return float(duration) if duration else 0.0
        except Exception:
            return 0.0

    async def get_video_current_time(self, page: Page) -> float:
        """Get the current playback position in seconds."""
        try:
            time_val = await page.evaluate("""
                () => {
                    const video = document.querySelector('video');
                    return video ? video.currentTime : 0;
                }
            """)
            return float(time_val) if time_val else 0.0
        except Exception:
            return 0.0

    async def is_video_ended(self, page: Page) -> bool:
        """Check if the video has finished playing."""
        try:
            ended = await page.evaluate("""
                () => {
                    const video = document.querySelector('video');
                    return video ? video.ended : true;
                }
            """)
            return bool(ended)
        except Exception:
            return True

    async def set_playback_rate(self, page: Page, rate: float = 1.0) -> None:
        """Set the video playback speed."""
        await page.evaluate(f"""
            () => {{
                const video = document.querySelector('video');
                if (video) video.playbackRate = {rate};
            }}
        """)

    # ------------------------------------------------------------------
    # Screenshot capture
    # ------------------------------------------------------------------

    async def capture_screenshot(
        self,
        page: Page,
        output_path: Path,
        clip_to_video: bool = True,
    ) -> Path | None:
        """
        Take a screenshot of the current video frame.

        Args:
            page: The Playwright page.
            output_path: Path to save the screenshot.
            clip_to_video: If True, crop to the video player area only.

        Returns:
            Path to the saved screenshot, or None on failure.
        """
        try:
            ensure_dir(output_path.parent)

            if clip_to_video:
                # Try to get the video element's bounding box
                video_box = await page.evaluate("""
                    () => {
                        const video = document.querySelector('video');
                        if (!video) return null;
                        const rect = video.getBoundingClientRect();
                        return {
                            x: Math.round(rect.x),
                            y: Math.round(rect.y),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height)
                        };
                    }
                """)

                if video_box and video_box["width"] > 0 and video_box["height"] > 0:
                    await page.screenshot(
                        path=str(output_path),
                        clip=video_box,
                        type="png",
                    )
                    return output_path

            # Full page screenshot as fallback
            await page.screenshot(path=str(output_path), type="png")
            return output_path

        except Exception as e:
            logger.error("Screenshot failed: %s", e)
            return None

    async def capture_screenshots_during_playback(
        self,
        page: Page,
        output_dir: Path,
        interval_seconds: int = 5,
        max_screenshots: int = 200,
    ) -> list[Path]:
        """
        Capture screenshots periodically during video playback.

        Args:
            page: Browser page with the video.
            output_dir: Directory to save screenshots.
            interval_seconds: Time between captures.
            max_screenshots: Maximum number of screenshots.

        Returns:
            List of paths to captured screenshots.
        """
        screenshots: list[Path] = []
        ensure_dir(output_dir)

        count = 0
        while not await self.is_video_ended(page) and count < max_screenshots:
            current_time = await self.get_video_current_time(page)
            filename = f"frame_{count:04d}_{current_time:.1f}s.png"
            path = output_dir / filename

            result = await self.capture_screenshot(page, path)
            if result:
                screenshots.append(result)
                count += 1

            await asyncio.sleep(interval_seconds)

        logger.info("Captured %d screenshots", len(screenshots))
        return screenshots

    # ------------------------------------------------------------------
    # Caption / transcript extraction
    # ------------------------------------------------------------------

    async def extract_captions(self, page: Page) -> list[dict]:
        """
        Extract captions/subtitles from the Udemy transcript panel.

        Returns:
            List of dicts with ``{text, start_time}`` for each caption segment.
        """
        captions: list[dict] = []

        try:
            # Try to open the transcript panel
            transcript_btn = await page.query_selector(
                "[data-purpose='transcript-toggle'], "
                "button:has-text('Transcript'), "
                "[aria-label='Transcript']"
            )
            if transcript_btn:
                await transcript_btn.click()
                await page.wait_for_timeout(1500)

            # Extract transcript entries
            entries = await page.query_selector_all(
                "[data-purpose='transcript-cue-group'], "
                "[class*='transcript--cue-container'], "
                ".transcript--cue-container--YkGeg"
            )

            for entry in entries:
                text_el = await entry.query_selector(
                    "[data-purpose='transcript-cue'], span[class*='cue-text']"
                )
                time_el = await entry.query_selector(
                    "[data-purpose='transcript-cue-time'], span[class*='cue-time']"
                )

                text = ""
                start_time = 0.0

                if text_el:
                    text = (await text_el.inner_text()).strip()
                if time_el:
                    time_text = (await time_el.inner_text()).strip()
                    start_time = self._parse_caption_time(time_text)

                if text:
                    captions.append({"text": text, "start_time": start_time})

            logger.info("Extracted %d caption segments from transcript panel", len(captions))

        except Exception as e:
            logger.warning("Could not extract captions: %s", e)

        return captions

    @staticmethod
    def _parse_caption_time(time_str: str) -> float:
        """Parse a caption timestamp like '1:23' or '01:23' to seconds."""
        import re
        parts = time_str.strip().split(":")
        try:
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
            elif len(parts) == 2:
                return int(parts[0]) * 60 + float(parts[1])
            else:
                return float(time_str)
        except (ValueError, IndexError):
            return 0.0
