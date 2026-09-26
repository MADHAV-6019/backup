"""
Instagram Playwright Bot
- Runs completely in the background (headless)
- Uses your saved cookies — no login required after first run
- Scrolls Reels, comments, follows, checks DMs, saves links to Supabase
- Stealth mode to avoid Instagram detection
"""

import asyncio
import json
import random
import re
import logging
from pathlib import Path
from playwright.async_api import async_playwright, Page, BrowserContext
from playwright_stealth import Stealth
from supabase import create_client, Client

# -------------------------------------------------------
# LOGGING
# -------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("bot_playwright.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# -------------------------------------------------------
# CONFIG
# -------------------------------------------------------
SUPABASE_URL = "https://ershquefcgtgsgotnomk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyc2hxdWVmY2d0Z3Nnb3Rub21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzY3OTIsImV4cCI6MjA5NjE1Mjc5Mn0.5xnOgJE0m8wgL6Ii77fzdS_zLpWcXik-DnRfwZkbkj4"

supabase = None
if SUPABASE_URL:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Failed to init Supabase: {e}")

# Stealth instance reused across all pages
_stealth = Stealth()
async def apply_stealth(page):
    await _stealth.apply_stealth_async(page)

COOKIES_FILE = Path(__file__).parent / "session_cookies.json"

# Persistent browser profile directory (saves EVERYTHING: cookies, localStorage, session)
PROFILE_DIR = Path(__file__).parent / "browser_profile_v2"

# How many reels to scroll through before checking DMs
REELS_BETWEEN_DM_CHECKS = 5

BUSINESS_KEYWORDS = [
    "business", "entrepreneur", "startup", "side hustle", "hustle",
    "passive income", "online business", "ecommerce", "dropshipping",
    "marketing", "sales", "b2b", "b2c", "saas", "founder",
    "ceo", "business owner", "small business", "biz"
]
INTERNSHIP_KEYWORDS = [
    "internship", "intern", "internships", "remote internship",
    "paid internship", "summer internship", "internship 2025",
    "internship 2026", "fresh graduate", "entry level", "graduate",
    "trainee", "apprenticeship", "internship opportunity",
    "hiring", "job", "jobs", "career", "fresher", "placement"
]
MONEY_KEYWORDS = [
    "make money", "earning", "earn money", "money", "income",
    "financial freedom", "invest", "investing", "crypto",
    "stock market", "trading", "forex", "wealth", "rich",
    "millionaire", "billionaire", "money mindset", "cash",
    "profit", "revenue", "make money online", "work from home"
]
ALL_KEYWORDS = list(set(BUSINESS_KEYWORDS + INTERNSHIP_KEYWORDS + MONEY_KEYWORDS))

COMMENTS = [
    "Great info! Where can I learn more about this? 🔥",
    "This is exactly what I've been looking for!",
    "How do I get started with this?",
    "Amazing content! Do you have a website with more details?",
    "Thanks for sharing this! Very helpful 🙌",
    "I've been trying to get into this space. Any tips?",
    "This is gold! Saved for later 📌",
    "Would love to connect and learn more!",
]

# -------------------------------------------------------
# HELPERS
# -------------------------------------------------------
def get_tag(caption: str) -> str:
    c = caption.lower()
    if any(k in c for k in INTERNSHIP_KEYWORDS): return "internship"
    if any(k in c for k in BUSINESS_KEYWORDS): return "business"
    if any(k in c for k in MONEY_KEYWORDS): return "money"
    return "other"

def is_relevant(caption: str) -> bool:
    c = caption.lower()
    return any(k in c for k in ALL_KEYWORDS)

def get_requested_comment(caption: str) -> str:
    """Intelligently extract the exact word the creator wants you to comment."""
    # Look for: comment "keyword", comment 'keyword', comment “keyword”
    match = re.search(r'comment\s+(?:the\s+word\s+)?["\'“”‘’]([a-zA-Z0-9_-]+)["\'“”‘’]', caption, re.IGNORECASE)
    if match:
        return match.group(1)
    
    # Fallback to a generic compliment
    return random.choice(COMMENTS)

async def get_visible_element(page: Page, selector: str):
    """Finds the visible element matching selector that is closest to the center of the viewport."""
    # Let Playwright's engine handle advanced selectors (like :has-text)
    elements = await page.query_selector_all(selector)
    if not elements:
        return None
        
    handle = await page.evaluate_handle("""(elements) => {
        let bestNode = null;
        let minDistance = Infinity;
        const centerY = window.innerHeight / 2;
        
        for (const node of elements) {
            const rect = node.getBoundingClientRect();
            // Check if element is at least partially in the viewport
            if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
                const nodeCenterY = rect.top + (rect.height / 2);
                const distance = Math.abs(centerY - nodeCenterY);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestNode = node;
                }
            }
        }
        return bestNode;
    }""", elements)
    
    if await handle.json_value() is None:
        return None
    return handle.as_element()

async def human_delay(min_s: float = 1.5, max_s: float = 4.0):
    await asyncio.sleep(random.uniform(min_s, max_s))

async def save_to_supabase(url: str, tag: str):
    if not supabase:
        log.warning(f"Supabase not configured. Would have saved: {url}")
        return
    try:
        supabase.table("extracted_links").insert({"url": url, "tag": tag}).execute()
        log.info(f"✅ Saved to Supabase: {url}")
    except Exception as e:
        log.error(f"Supabase insert failed: {e}")

def extract_external_urls(text: str) -> list[str]:
    """Extract non-Instagram URLs from text."""
    if not text: return []
    # Stop at quotes, spaces, or brackets to cleanly extract from JSON/HTML
    urls = re.findall(r'https?://[^\s"\'<>\]\[\\]+', text)
    return list(set(u for u in urls if 'instagram.com' not in u))

# -------------------------------------------------------
# SESSION: Save / Load cookies
# -------------------------------------------------------
async def save_cookies(context: BrowserContext):
    cookies = await context.cookies()
    COOKIES_FILE.write_text(json.dumps(cookies, indent=2), encoding="utf-8")
    log.info(f"✅ Saved {len(cookies)} cookies to {COOKIES_FILE}")

async def load_cookies(context: BrowserContext) -> bool:
    if not COOKIES_FILE.exists():
        return False
    try:
        cookies = json.loads(COOKIES_FILE.read_text(encoding="utf-8"))
        await context.add_cookies(cookies)
        log.info(f"✅ Loaded {len(cookies)} cookies")
        return True
    except Exception as e:
        log.error(f"Failed to load cookies: {e}")
        return False

# -------------------------------------------------------
# FIRST-RUN LOGIN: open browser so user can log in manually
# Uses persistent context so ALL session data is saved
# -------------------------------------------------------
async def do_manual_login():
    log.info("=" * 60)
    log.info("FIRST RUN: Opening browser for manual login...")
    log.info("Please log in to Instagram in the browser window.")
    log.info("After logging in, press ENTER in this terminal.")
    log.info("=" * 60)

    PROFILE_DIR.mkdir(exist_ok=True)
    async with async_playwright() as p:
        # We use a completely vanilla browser for manual login so Meta doesn't block it
        context = await p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            headless=False,
            viewport=None
        )
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("https://www.instagram.com/", wait_until="domcontentloaded")

        input("\n>>> Press ENTER after you have logged in to Instagram <<<\n")

        log.info("✅ Profile saved! Starting headless bot...")
        await context.close()
    log.info("Login saved! Starting headless bot...")

# -------------------------------------------------------
# REEL ACTIONS
# -------------------------------------------------------
async def get_reel_caption(page: Page) -> str:
    """Get the text caption of the current reel."""
    try:
        caption = await page.evaluate("""() => {
            let best = '';
            document.querySelectorAll('h1, span[dir="auto"], div[dir="auto"]').forEach(el => {
                const rect = el.getBoundingClientRect();
                // Only look at elements actually visible on the screen right now
                const isVisible = (rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 0);
                if (isVisible && el.textContent.trim().length > best.length) {
                    best = el.textContent.trim();
                }
            });
            return best;
        }""")
        return caption or ""
    except:
        return ""

async def like_reel(page: Page) -> bool:
    """Click the Like button if present and not already liked."""
    try:
        like_icon = await get_visible_element(page, 'svg[aria-label="Like"]')
        if like_icon:
            # Click the parent button instead of the raw SVG
            btn = await page.evaluate_handle("(el) => el.closest('button, [role=\"button\"]') || el", like_icon)
            await btn.click(force=True)
            log.info("❤️ Liked the reel")
            await human_delay(1, 2)
            return True
        else:
            log.debug("Like button not found (might already be liked)")
    except Exception as e:
        log.error(f"Like failed: {e}")
    return False

async def follow_creator(page: Page) -> bool:
    """Click the Follow button if present."""
    try:
        follow_btn = await get_visible_element(page, 'div[role="button"]:has-text("Follow"), button:has-text("Follow")')
        if follow_btn:
            await follow_btn.click(force=True)
            log.info("👤 Followed creator")
            await human_delay(1, 2)
            return True
    except Exception as e:
        log.debug(f"Follow failed: {e}")
    return False

async def post_comment(page: Page, comment: str) -> bool:
    """Open the comment box, type a comment, and post it."""
    try:
        # Click the comment icon natively on its parent button
        comment_icon = await get_visible_element(page, 'svg[aria-label="Comment"]')
        if not comment_icon:
            log.warning("Comment icon not found")
            return False

        btn = await page.evaluate_handle("(el) => el.closest('button, [role=\"button\"]') || el", comment_icon)
        await btn.click(force=True)

        # Wait for comment box to appear (up to 6 seconds)
        # Wait for comment box to appear and safely type into it
        success = False
        for _ in range(12):
            await asyncio.sleep(0.5)
            box = await get_visible_element(page, 'textarea, input, div[role="textbox"][contenteditable="true"]')
            if box:
                try:
                    await box.click(force=True)  # Force click to ensure it has focus
                    await human_delay(0.5, 1.0)
                    
                    # Refetch in case Instagram swapped the DOM element (common React behavior)
                    box = await get_visible_element(page, 'textarea, input, div[role="textbox"][contenteditable="true"]')
                    if not box: continue
                    
                    await box.focus()
                    await page.keyboard.type(comment, delay=30)
                    success = True
                    break
                except Exception as e:
                    if "attached" in str(e).lower() or "stale" in str(e).lower() or "closed" in str(e).lower():
                        continue
                    raise e

        if not success:
            log.warning("Comment box did not appear or remained detached")
            return False

        await human_delay(1, 2)

        # Click Post button
        post_btn = await get_visible_element(page, 'div[role="button"]:has-text("Post"), button:has-text("Post")')
        if post_btn:
            await post_btn.click(force=True)
            log.info(f"💬 Posted comment: {comment[:50]}")
        else:
            log.warning("Post button not found, pressing Enter instead")
            await page.keyboard.press("Enter")
            log.info(f"💬 Posted comment via Enter: {comment[:50]}")
            
        await human_delay(2, 3)

        # Close comment panel natively
        close_btn = await get_visible_element(page, 'svg[aria-label="Close"]')
        if close_btn:
            btn_close = await page.evaluate_handle("(el) => el.closest('button, [role=\"button\"]') || el", close_btn)
            await btn_close.click(force=True)
        return True

    except Exception as e:
        log.error(f"Comment failed: {e}")
        return False

async def wait_for_reel_to_end(page: Page) -> None:
    """Wait until the current video finishes playing."""
    try:
        log.info("⏳ Waiting for reel to finish...")
        await page.evaluate("""() => new Promise((resolve) => {
            const video = document.querySelector('video');
            if (!video) return resolve();
            if (video.ended || video.paused) return resolve();
            video.addEventListener('ended', resolve, {once: true});
            // Safety timeout: max 90 seconds
            setTimeout(resolve, 90000);
        })""")
        log.info("✅ Reel finished")
    except Exception as e:
        log.debug(f"wait_for_reel_to_end: {e}")
        await asyncio.sleep(15)  # fallback wait

async def scroll_to_next_reel(page: Page):
    """Scroll to the next reel."""
    try:
        # Hover over the center of the video to reveal the Next button
        await page.mouse.move(200, 400)
        await human_delay(0.5, 1)
        
        next_btn = await page.query_selector('svg[aria-label="Next"]')
        if next_btn:
            await page.evaluate("(el) => { const btn = el.closest('button, [role=\"button\"]') || el.parentElement; btn.click(); }", next_btn)
            log.info("⬇️  Scrolled via Next button")
        else:
            # Native mouse wheel scroll (very reliable)
            await page.mouse.wheel(0, 1000)
            log.info("⬇️  Scrolled via mouse wheel")
    except Exception as e:
        log.debug(f"Scroll error: {e}")

    await human_delay(2, 4)

# -------------------------------------------------------
# DM ACTIONS
# -------------------------------------------------------
async def check_dms(page: Page, context: BrowserContext):
    """Check both inbox and message requests for bot links."""
    urls_found = []

    for url_path in ["/direct/", "/direct/requests/"]:
        label = "Inbox" if "requests" not in url_path else "Requests"
        log.info(f"📬 Checking DMs: {label}")

        await page.goto(f"https://www.instagram.com{url_path}", wait_until="domcontentloaded")
        await human_delay(3, 5)

        # Debug: Dump the HTML of the Inbox/Requests page to find the exact thread selectors
        inbox_html = await page.evaluate("() => document.body.innerHTML")
        debug_inbox = Path(__file__).parent / f"debug_{label.lower()}.html"
        debug_inbox.write_text(inbox_html, encoding="utf-8")
        log.info(f"💾 Saved {label} HTML to {debug_inbox.name} for debugging")

        # Find DM threads using multiple robust selectors (broadened to catch any direct links or list items)
        threads = await page.query_selector_all('a[href*="/direct/t/"], a[href*="/direct/requests/"], div[role="listitem"], div[role="button"]:has(img)')
        
        valid_threads = []
        for t in threads:
            href = await t.get_attribute("href")
            role = await t.get_attribute("role")
            if (href and "/direct/" in href) or role == "listitem" or role == "button":
                valid_threads.append(t)

        for i, thread in enumerate(valid_threads[:5]):  # Check up to 5 threads
            try:
                # Click natively to bypass overlay blocks and trigger React events
                await thread.click(force=True)
                await human_delay(2, 4)

                # Accept if on requests page
                if "requests" in url_path:
                    accept_btns = await page.query_selector_all('div[role="button"]:has-text("Accept"), button:has-text("Accept")')
                    for btn in accept_btns:
                        if await btn.is_visible():
                            await btn.click(force=True)
                            log.info("✅ Accepted message request")
                            await human_delay(2, 4)
                            break

                # 1. Grab raw HTML and unescape JSON slashes to perform an "X-Ray" on hidden data
                raw_html = await page.evaluate("() => document.body.innerHTML")
                clean_html = raw_html.replace("\\/", "/")
                
                # 2. Extract standard URLs from visible chat text
                chat_text = await page.evaluate("() => document.body.innerText")
                urls = extract_external_urls(chat_text)
                
                # 3. Extract hidden URLs from xma_web_url buttons via X-Ray
                # JSON Format is usually: "Button Text","xma_web_url",[9],"https://link..."
                hidden_matches = re.findall(r'"xma_web_url",[^"]*,"(https?://[^"]+)"', clean_html)
                for h in hidden_matches:
                    if "instagram.com" not in h:
                        urls.append(h)
                urls = list(set(urls))
                
                # 4. If no URLs found, check for hidden "postback" Quick Reply buttons
                if not urls:
                    # Look for hidden button definitions like: "Send me the article","postback"
                    postbacks = re.findall(r'"([^"]+)","postback"', clean_html)
                    valid_postbacks = [p for p in postbacks if len(p) < 40]
                    
                    if valid_postbacks:
                        # Grab the most recent button text
                        reply_text = valid_postbacks[-1]
                        log.info(f"🤖 Hidden Quick Reply detected! Sending exactly: '{reply_text}'")
                        
                        chat_box = await page.query_selector('div[role="textbox"][contenteditable="true"], textarea')
                        if chat_box:
                            await chat_box.fill(reply_text)
                            await page.keyboard.press("Enter")
                            await human_delay(5, 7) # wait for the creator's bot to reply
                            
                            # Re-read the HTML to get the newly sent link!
                            raw_html = await page.evaluate("() => document.body.innerHTML")
                            clean_html = raw_html.replace("\\/", "/")
                            
                            chat_text = await page.evaluate("() => document.body.innerText")
                            urls = extract_external_urls(chat_text)
                            
                            hidden_matches = re.findall(r'"xma_web_url",[^"]*,"(https?://[^"]+)"', clean_html)
                            for h in hidden_matches:
                                if "instagram.com" not in h:
                                    urls.append(h)
                            urls = list(set(urls))
                
                if urls:
                    log.info(f"🔗 Found exact links via X-Ray: {urls}")
                    urls_found.extend(urls)

            except Exception as e:
                log.debug(f"Thread {i} error: {e}")

        await human_delay(2, 4)

    # Save all unique external links to Supabase
    for url in set(urls_found):
        await save_to_supabase(url, "dm_link")

    return urls_found

# -------------------------------------------------------
# MAIN BOT LOOP
# -------------------------------------------------------
async def run_bot():
    # First run: manual login if no profile saved
    if not PROFILE_DIR.exists() or not any(PROFILE_DIR.iterdir()):
        await do_manual_login()

    log.info("🤖 Starting headless bot...")

    async with async_playwright() as p:
        # Use persistent context — preserves cookies, localStorage, sessionStorage
        context = await p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
            ],
            viewport=None
        )

        page = context.pages[0] if context.pages else await context.new_page()
        await apply_stealth(page)

        # Verify login
        await page.goto("https://www.instagram.com/", wait_until="domcontentloaded")
        await human_delay(3, 5)

        # Take a screenshot to verify we're actually logged in
        screenshot_path = Path(__file__).parent / "debug_screenshot.png"
        await page.screenshot(path=str(screenshot_path))
        log.info(f"📸 Screenshot saved to {screenshot_path} — check it to verify login")

        if "login" in page.url or "accounts" in page.url:
            log.error("❌ Session expired or not logged in!")
            log.error(f"Delete the browser_profile folder and run again to re-login.")
            await context.close()
            return

        log.info("✅ Logged in!")

        # ---------- TESTING OVERRIDE ----------
        # Check DMs immediately for debugging!
        log.info("🧪 TESTING OVERRIDE: Checking DMs immediately...")
        await check_dms(page, context)
        log.info("✅ Finished checking DMs.")
        # --------------------------------------

        log.info("Navigating to Reels...")
        await page.goto("https://www.instagram.com/reels/", wait_until="domcontentloaded")
        await human_delay(4, 6)

        reel_count = 0
        dm_page = await context.new_page()
        await apply_stealth(dm_page)

        try:
            while True:
                # ---- REEL CYCLE ----
                caption = await get_reel_caption(page)
                log.info(f"📄 Caption: {caption[:100]}")

                if is_relevant(caption):
                    tag = get_tag(caption)
                    log.info(f"🎯 Relevant [{tag}]! Liking, following + commenting...")

                    await like_reel(page)
                    await follow_creator(page)
                    await human_delay(1, 2)

                    # Intelligently comment the requested keyword, or fallback to generic
                    comment = get_requested_comment(caption)
                    log.info(f"🧠 Determined best comment: '{comment}'")
                    await post_comment(page, comment)
                    await human_delay(2, 4)
                else:
                    log.info("⏭️  Not relevant, skipping")

                # Wait for video to finish, then scroll
                await wait_for_reel_to_end(page)
                await scroll_to_next_reel(page)
                reel_count += 1

                # ---- DM CHECK every N reels ----
                if reel_count % REELS_BETWEEN_DM_CHECKS == 0:
                    log.info(f"📬 Checking DMs after {reel_count} reels...")
                    await check_dms(dm_page, context)
                    await page.bring_to_front()
                    await human_delay(2, 4)

        except KeyboardInterrupt:
            log.info("⛔ Stopped by user (Ctrl+C)")
        except Exception as e:
            log.error(f"Fatal error: {e}")
        finally:
            log.info("Closing browser...")
            await context.close()
            log.info("Bot stopped.")

# -------------------------------------------------------
# ENTRY POINT
# -------------------------------------------------------
if __name__ == "__main__":
    asyncio.run(run_bot())
