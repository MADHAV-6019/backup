"""
Playwright browser session manager.

Handles persistent sessions so the user only needs to log into Udemy once.
Session cookies and local storage are saved to ``browser_data/``.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Optional

from playwright.async_api import (
    BrowserContext,
    Page,
    Playwright,
    async_playwright,
)

from notes_ai.core.config import AppConfig
from notes_ai.utils.logging import get_logger

logger = get_logger("browser.session")

UDEMY_BASE = "https://www.udemy.com"
UDEMY_LOGIN_URL = f"{UDEMY_BASE}/join/login-popup/"
UDEMY_HOME_URL = f"{UDEMY_BASE}/home/my-courses/learning/"


class BrowserSession:
    """
    Manages a Playwright persistent browser context for Udemy.

    Usage::

        async with BrowserSession(config) as session:
            page = await session.get_page()
            await page.goto("https://www.udemy.com/course/...")
    """

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self._playwright: Optional[Playwright] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None

        # Ensure browser data dir exists
        self._user_data_dir = config.browser_data_path
        self._user_data_dir.mkdir(parents=True, exist_ok=True)

    async def __aenter__(self) -> "BrowserSession":
        """Launch persistent browser context."""
        self._playwright = await async_playwright().start()

        browser_cfg = self.config.browser
        self._context = await self._playwright.chromium.launch_persistent_context(
            user_data_dir=str(self._user_data_dir),
            headless=browser_cfg.headless,
            viewport={
                "width": browser_cfg.viewport_width,
                "height": browser_cfg.viewport_height,
            },
            slow_mo=browser_cfg.slow_mo_ms,
            args=[
                "--start-maximized",
                "--disable-blink-features=AutomationControlled",
            ],
            ignore_default_args=["--enable-automation"],
            locale="en-US",
        )

        logger.info("Browser session started (user_data_dir=%s)", self._user_data_dir)
        return self

    async def __aexit__(self, *args: object) -> None:
        """Close the browser context and Playwright."""
        if self._context:
            await self._context.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("Browser session closed")

    # ------------------------------------------------------------------
    # Page management
    # ------------------------------------------------------------------

    async def get_page(self) -> Page:
        """
        Get or create the primary browser page.

        Returns:
            The active ``Page`` instance.
        """
        if not self._context:
            raise RuntimeError("Browser session not started. Use 'async with BrowserSession(...):'")

        if self._context.pages:
            self._page = self._context.pages[0]
        else:
            self._page = await self._context.new_page()

        return self._page

    async def new_page(self) -> Page:
        """Open a new tab/page."""
        if not self._context:
            raise RuntimeError("Browser session not started.")
        return await self._context.new_page()

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    async def interactive_login(self) -> None:
        """
        Open Udemy login page and wait for the user to log in manually.

        The method blocks until it detects the user has authenticated
        (by checking for profile/avatar elements on the home page).
        """
        page = await self.get_page()
        await page.goto(UDEMY_LOGIN_URL, wait_until="domcontentloaded")

        logger.info("Waiting for manual login... (complete login in the browser window)")

        # Wait for the user to complete login — detected by navigation away
        # from the login page or presence of authenticated UI elements.
        try:
            # Wait up to 5 minutes for login
            await page.wait_for_url(
                f"{UDEMY_BASE}/**",
                timeout=300_000,
            )

            # Additional check: wait for an authenticated element
            await page.wait_for_selector(
                "[data-purpose='header-profile'], .ud-avatar, [data-purpose='user-dropdown']",
                timeout=30_000,
            )
            logger.info("Login detected! Session saved.")

        except Exception as e:
            logger.warning("Login wait timed out or was interrupted: %s", e)
            # Session data is still saved in user_data_dir

    async def is_logged_in(self) -> bool:
        """
        Check whether the current session is authenticated.

        Returns:
            ``True`` if the user appears to be logged into Udemy.
        """
        page = await self.get_page()

        try:
            await page.goto(UDEMY_HOME_URL, wait_until="domcontentloaded")
            # If redirected to login or front page, we're not logged in
            if "login" in page.url.lower() or "join" in page.url.lower():
                return False

            # If we successfully loaded the my-courses/learning URL, we are logged in
            if "my-courses/learning" in page.url.lower():
                return True

            # Fallback: Look for authenticated UI elements
            avatar = await page.query_selector(
                "[data-purpose='header-profile'], .ud-avatar, [data-purpose='user-dropdown']"
            )
            return avatar is not None

        except Exception as e:
            logger.error("Error checking login status: %s", e)
            return False

    async def navigate_to(self, url: str, wait_until: str = "domcontentloaded") -> Page:
        """
        Navigate the primary page to a URL.

        Args:
            url: Target URL.
            wait_until: Playwright load state (domcontentloaded, load, networkidle).

        Returns:
            The page after navigation.
        """
        page = await self.get_page()
        await page.goto(url, wait_until=wait_until)
        return page
