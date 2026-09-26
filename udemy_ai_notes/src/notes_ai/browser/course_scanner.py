"""
Course scanner — detects the curriculum structure of a Udemy course.

Navigates to the course page, expands all sections, and extracts
section titles, lecture titles, durations, and content types.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from playwright.async_api import Page

from notes_ai.browser.session import BrowserSession
from notes_ai.core.models import Course, CourseSection, Lecture
from notes_ai.utils.logging import get_logger

logger = get_logger("browser.course_scanner")


class CourseScanner:
    """Scans a Udemy course page to extract the full curriculum structure."""

    def __init__(self, session: BrowserSession) -> None:
        self.session = session

    async def get_enrolled_courses(self) -> dict[str, str]:
        """
        Fetch enrolled courses from the user's learning dashboard.
        
        Returns:
            Dictionary mapping course title to course URL.
        """
        from notes_ai.browser.session import UDEMY_HOME_URL
        page = await self.session.navigate_to(UDEMY_HOME_URL, wait_until="domcontentloaded")
        
        logger.info("Fetching enrolled courses from dashboard...")
        
        # Wait for course cards to load
        try:
            await page.wait_for_selector("a[href*='/course/']", timeout=10000)
        except Exception:
            logger.warning("Timeout waiting for course links to load.")
            return {}
            
        courses = {}
        # Find all anchors that link to courses
        course_links = await page.query_selector_all("a[href*='/course/']")
        
        for link in course_links:
            href = await link.get_attribute("href")
            if not href or "/learn/" in href:
                continue
                
            # Extract title from the anchor's inner text or aria-label
            text = await link.inner_text()
            title = text.strip().split("\n")[0]
            if not title:
                title = await link.get_attribute("aria-label") or "Unknown Course"
                
            if href.startswith("/"):
                href = f"https://www.udemy.com{href}"
                
            if title and href and title not in courses:
                courses[title] = href
                
        logger.info("Found %d enrolled courses.", len(courses))
        return courses

    async def scan_course(self, course_url: str) -> Course:
        """
        Scan a Udemy course and return a structured ``Course`` model.

        Args:
            course_url: Full URL to the Udemy course page.

        Returns:
            Populated ``Course`` with sections and lectures.
        """
        # Normalize URL — ensure we're on the curriculum/learn page
        learn_url = self._normalize_course_url(course_url)
        page = await self.session.navigate_to(learn_url, wait_until="domcontentloaded")
        
        # Wait for React to mount the sidebar and course content
        try:
            await page.wait_for_selector(
                "li[class*='curriculum-item'], [class*='accordion-panel-heading'], [data-purpose='curriculum-section']",
                timeout=20000
            )
        except Exception:
            logger.warning("Timeout waiting for curriculum items to load; attempting to scrape anyway.")

        logger.info("Scanning course at: %s", learn_url)

        # Extract course title
        title = await self._extract_course_title(page)
        instructor = await self._extract_instructor(page)

        # Expand all sections in the sidebar
        await self._expand_all_sections(page)

        # Extract curriculum
        sections = await self._extract_curriculum(page)

        # Assign global lecture indices
        global_index = 0
        total_duration = 0.0
        for section in sections:
            for lecture in section.lectures:
                global_index += 1
                lecture.index = global_index
                lecture.section_title = section.title
                total_duration += lecture.duration_seconds

        course = Course(
            title=title,
            url=course_url,
            instructor=instructor,
            total_lectures=global_index,
            total_duration_seconds=total_duration,
            sections=sections,
            scanned_at=datetime.now(timezone.utc),
        )

        logger.info(
            "Scan complete: '%s' — %d sections, %d lectures, %.0f min total",
            title,
            len(sections),
            global_index,
            total_duration / 60,
        )
        return course

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _normalize_course_url(self, url: str) -> str:
        """Ensure the URL points to the course learn/lecture page."""
        # Strip trailing slashes and fragments
        url = url.rstrip("/").split("#")[0].split("?")[0]

        # If it's the landing page, convert to the learn page
        if "/learn/" not in url:
            # e.g. https://www.udemy.com/course/some-course/
            #   → https://www.udemy.com/course/some-course/learn/
            url = url + "/learn/"

        return url

    async def _extract_course_title(self, page: Page) -> str:
        """Extract the course title from the page."""
        selectors = [
            "[data-purpose='course-header-title']",
            "h1.ud-heading-xl",
            "h1",
            "[class*='course-title']",
        ]
        for selector in selectors:
            element = await page.query_selector(selector)
            if element:
                text = await element.inner_text()
                if text and text.strip():
                    return text.strip()

        # Fallback: page title
        title = await page.title()
        return title.split("|")[0].strip() if title else "Unknown Course"

    async def _extract_instructor(self, page: Page) -> str | None:
        """Try to extract the instructor name."""
        selectors = [
            "[data-purpose='instructor-name']",
            "[class*='instructor'] a",
            "[class*='instructor-name']",
        ]
        for selector in selectors:
            element = await page.query_selector(selector)
            if element:
                text = await element.inner_text()
                if text and text.strip():
                    return text.strip()
        return None

    async def _expand_all_sections(self, page: Page) -> None:
        """Click on all collapsed section headers to expand them."""
        try:
            # Look for "Expand All" button first
            expand_all = await page.query_selector(
                "[data-purpose='expand-toggle'], button:has-text('Expand all')"
            )
            if expand_all:
                await expand_all.click()
                await page.wait_for_timeout(1000)
                logger.debug("Clicked 'Expand All'")
                return

            # Otherwise, click each collapsed section individually
            collapsed_panels = await page.query_selector_all(
                "[data-purpose='section-panel-header'][aria-expanded='false'], "
                ".section--section-heading--sCEgM[aria-expanded='false']"
            )
            for panel in collapsed_panels:
                try:
                    await panel.click()
                    await page.wait_for_timeout(200)
                except Exception:
                    pass

            logger.debug("Expanded %d sections", len(collapsed_panels))

        except Exception as e:
            logger.warning("Could not expand all sections: %s", e)

    async def _extract_curriculum(self, page: Page) -> list[CourseSection]:
        """Extract all sections and lectures from the curriculum sidebar."""
        sections_dict: dict[str, CourseSection] = {}
        
        sidebar_selector = "[data-purpose='sidebar'], [data-purpose='course-content-sidebar'], .sidebar-container, [class*='course-content--sidebar'], aside"

        logger.info("Scrolling curriculum to top to bypass virtualization...")
        for _ in range(15):
            await page.evaluate(f'''
                const sb = document.querySelector("{sidebar_selector}");
                if (sb) sb.scrollBy(0, -2000);
                else window.scrollBy(0, -2000);
            ''')
            await page.wait_for_timeout(200)

        logger.info("Scanning and scrolling curriculum downwards...")
        
        for _ in range(30):
            # Expand any collapsed sections in view instantly via JS
            await page.evaluate('''
                const panels = document.querySelectorAll(
                    "button[aria-expanded='false'][class*='panel-toggler'], " +
                    "[data-purpose='section-panel-header'][aria-expanded='false'], " +
                    ".section--section-heading--sCEgM[aria-expanded='false']"
                );
                panels.forEach(p => p.click());
            ''')
            await page.wait_for_timeout(300)

            # Extract all currently visible sections and lectures instantly via JS
            extracted_sections = await page.evaluate('''
                () => {
                    const sections = [];
                    const allSecEls = document.querySelectorAll("[data-purpose='section-panel'], [data-purpose='curriculum-section'], [data-purpose='accordion-panel'], .section--section--BukKG, [class*='accordion-panel'], [class*='curriculum-item-group']");
                    const sectionEls = Array.from(allSecEls).filter(el => !el.parentElement.closest("[data-purpose='section-panel'], [data-purpose='curriculum-section'], [data-purpose='accordion-panel'], .section--section--BukKG, [class*='accordion-panel'], [class*='curriculum-item-group']"));
                    
                    for (const sec of sectionEls) {
                        const titleEl = sec.querySelector("[data-purpose='section-heading'], [data-purpose='panel-title'], h3, .section--section-title--GIlmO, span[class*='section-title']");
                        let sectionTitle = "Untitled Section";
                        if (titleEl && titleEl.innerText) {
                            sectionTitle = titleEl.innerText.trim().split("\\n")[0];
                        }
                        
                        const lecs = [];
                        const allLecEls = sec.querySelectorAll("li[class*='curriculum-item'], div[data-purpose='curriculum-item']");
                        const lecEls = Array.from(allLecEls).filter(el => !el.parentElement.closest("li[class*='curriculum-item'], div[data-purpose='curriculum-item']"));
                        
                        for (const lec of lecEls) {
                            const titleContainer = lec.querySelector("[class*='item-title'], [data-purpose='curriculum-item-title']");
                            const text = (titleContainer ? titleContainer.innerText : lec.innerText) || "";
                            if (!text) continue;
                            
                            // Filter out "Play"
                            const lines = text.trim().split("\\n").map(l => l.trim()).filter(l => l && l.toLowerCase() !== 'play');
                            if (lines.length === 0) continue;
                            
                            // Prevent nested items from being treated as separate by ensuring we only take the first valid title line
                            const title = lines[0];
                            
                            const durEl = lec.querySelector("[class*='content-summary'], [class*='item-content-summary'], span");
                            const durText = durEl ? durEl.innerText : "";
                            
                            const checkEl = lec.querySelector("[data-purpose='progress-toggle-complete'], input[type='checkbox']:checked, [class*='completed']");
                            
                            lecs.push({
                                title: title,
                                durText: durText,
                                isCompleted: !!checkEl
                            });
                        }
                        sections.push({ title: sectionTitle, lectures: lecs });
                    }
                    return sections;
                }
            ''')

            if not extracted_sections and not sections_dict:
                logger.warning("No section containers found; trying flat lecture list")
                lectures = await self._extract_flat_lectures(page)
                if lectures:
                    return [CourseSection(title="Main Content", index=1, lectures=lectures)]
                return []

            # Rehydrate JSON back into Python models
            for sec_data in extracted_sections:
                section_title = sec_data["title"]
                
                lectures = []
                for lec_data in sec_data["lectures"]:
                    duration = self._parse_duration(lec_data["durText"])
                    title = lec_data["title"]
                    text_lower = title.lower()
                    
                    content_type = "video"
                    if "quiz" in text_lower:
                        content_type = "quiz"
                    elif "article" in text_lower or "reading" in text_lower:
                        content_type = "article"
                    elif "assignment" in text_lower or "exercise" in text_lower:
                        content_type = "exercise"
                        
                    if content_type == "video":
                        lectures.append(Lecture(
                            index=0,
                            title=title,
                            duration_seconds=duration,
                            content_type=content_type,
                            is_completed=lec_data["isCompleted"]
                        ))

                # Merge into dictionary to prevent duplicates from scrolling
                if section_title not in sections_dict:
                    sections_dict[section_title] = CourseSection(
                        title=section_title, index=0, lectures=lectures
                    )
                else:
                    existing = {l.title for l in sections_dict[section_title].lectures}
                    for l in lectures:
                        if l.title not in existing:
                            sections_dict[section_title].lectures.append(l)
                            existing.add(l.title)

            # Scroll down to load next batch
            await page.evaluate(f'''
                const sb = document.querySelector("{sidebar_selector}");
                if (sb) sb.scrollBy(0, 1500);
                else window.scrollBy(0, 1500);
            ''')
            await page.wait_for_timeout(600)

        # Re-assign sequential indices
        sections = list(sections_dict.values())
        for idx, sec in enumerate(sections, start=1):
            sec.index = idx

        return sections

    async def _parse_lecture_element(
        self, element: object, parent: object
    ) -> Lecture | None:
        """Parse a single lecture element into a Lecture model."""
        try:
            # Title
            title_el = await element.query_selector(
                "[class*='item-title'], [data-purpose='curriculum-item-title']"
            )
            
            title_text = await (title_el.inner_text() if title_el else element.inner_text())
            if not title_text or not title_text.strip():
                return None
            
            # Filter out "Play" or screen reader text that might get caught
            lines = [line.strip() for line in title_text.strip().split("\n") if line.strip() and line.strip().lower() != "play"]
            if not lines:
                return None
            title = lines[0]

            # Duration — look for time text nearby
            duration = 0.0
            duration_el = await element.query_selector(
                "[class*='content-summary'], [class*='item-content-summary'], span"
            )
            if duration_el:
                dur_text = await duration_el.inner_text()
                duration = self._parse_duration(dur_text)

            # Content type detection
            content_type = "video"
            text_lower = title_text.lower()
            if "quiz" in text_lower:
                content_type = "quiz"
            elif "article" in text_lower or "reading" in text_lower:
                content_type = "article"
            elif "assignment" in text_lower or "exercise" in text_lower:
                content_type = "exercise"

            # Completion status
            is_completed = False
            check_el = await element.query_selector(
                "[data-purpose='progress-toggle-complete'], "
                "input[type='checkbox']:checked, "
                "[class*='completed']"
            )
            if check_el:
                is_completed = True

            return Lecture(
                index=0,  # Will be assigned globally later
                title=title,
                duration_seconds=duration,
                content_type=content_type,
                is_completed=is_completed,
            )

        except Exception as e:
            logger.debug("Failed to parse lecture element: %s", e)
            return None

    async def _extract_flat_lectures(self, page: Page) -> list[Lecture]:
        """Fallback: extract lectures from a flat list (no sections)."""
        elements = await page.query_selector_all(
            "[data-purpose='curriculum-item-title'], "
            "li[class*='curriculum-item']"
        )
        lectures: list[Lecture] = []
        for el in elements:
            lec = await self._parse_lecture_element(el, page)
            if lec:
                lectures.append(lec)
        return lectures

    @staticmethod
    def _parse_duration(text: str) -> float:
        """
        Parse a duration string like '5:30' or '1hr 23min' into seconds.

        Args:
            text: Raw duration text from the page.

        Returns:
            Duration in seconds (0.0 if unparseable).
        """
        if not text:
            return 0.0

        text = text.strip()

        # Try MM:SS or HH:MM:SS
        match = re.search(r"(\d+):(\d+):(\d+)", text)
        if match:
            h, m, s = int(match.group(1)), int(match.group(2)), int(match.group(3))
            return h * 3600 + m * 60 + s

        match = re.search(r"(\d+):(\d+)", text)
        if match:
            m, s = int(match.group(1)), int(match.group(2))
            return m * 60 + s

        # Try "Xhr Ymin" or "Ymin"
        total = 0.0
        hr_match = re.search(r"(\d+)\s*hr", text, re.IGNORECASE)
        min_match = re.search(r"(\d+)\s*min", text, re.IGNORECASE)
        sec_match = re.search(r"(\d+)\s*sec", text, re.IGNORECASE)

        if hr_match:
            total += int(hr_match.group(1)) * 3600
        if min_match:
            total += int(min_match.group(1)) * 60
        if sec_match:
            total += int(sec_match.group(1))

        return total
