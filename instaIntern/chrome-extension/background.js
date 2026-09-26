// -------------------------------------------------------
// SUPABASE CONFIG
// -------------------------------------------------------
const SUPABASE_URL = "https://ershquefcgtgsgotnomk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyc2hxdWVmY2d0Z3Nnb3Rub21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzY3OTIsImV4cCI6MjA5NjE1Mjc5Mn0.5xnOgJE0m8wgL6Ii77fzdS_zLpWcXik-DnRfwZkbkj4";

// -------------------------------------------------------
// KEYWORD & COMMENT CONFIG
// -------------------------------------------------------
const BUSINESS_KEYWORDS = [
    "business","entrepreneur","startup","side hustle","hustle",
    "passive income","online business","ecommerce","dropshipping",
    "marketing","sales","b2b","b2c","saas","founder",
    "ceo","business owner","small business","biz"
];
const INTERNSHIP_KEYWORDS = [
    "internship","intern","internships","remote internship",
    "paid internship","summer internship","internship 2025",
    "internship 2026","fresh graduate","entry level","graduate",
    "trainee","apprenticeship","internship opportunity"
];
const MONEY_KEYWORDS = [
    "make money","earning","earn money","money","income",
    "financial freedom","invest","investing","crypto",
    "stock market","trading","forex","wealth","rich",
    "millionaire","billionaire","money mindset","cash",
    "profit","revenue","make money online","work from home"
];
const ALL_KEYWORDS = [...new Set([...BUSINESS_KEYWORDS,...INTERNSHIP_KEYWORDS,...MONEY_KEYWORDS])];

const COMMENTS = [
    "Great info! Where can I learn more about this? 🔥",
    "This is exactly what I've been looking for!",
    "How do I get started with this?",
    "Amazing content! Do you have a website with more details?",
    "Thanks for sharing this! Very helpful 🙌",
    "I've been trying to get into this space. Any tips?",
    "This is gold! Saved for later 📌",
    "Would love to connect and learn more!",
];

function getTag(caption) {
    const c = caption.toLowerCase();
    if (INTERNSHIP_KEYWORDS.some(k => c.includes(k))) return 'internship';
    if (BUSINESS_KEYWORDS.some(k => c.includes(k))) return 'business';
    if (MONEY_KEYWORDS.some(k => c.includes(k))) return 'money';
    return 'other';
}

// -------------------------------------------------------
// PERSISTENT STATE via chrome.storage.session
// Service workers can be killed & restarted at any time.
// We store all state in session storage so it survives restarts.
// -------------------------------------------------------
async function getState() {
    const data = await chrome.storage.session.get([
        'isRunning','reelsTabId','dmsTabId','botWindowId','dmIndex','dmPhase'
    ]);
    return {
        isRunning:   data.isRunning   ?? false,
        reelsTabId:  data.reelsTabId  ?? null,
        dmsTabId:    data.dmsTabId    ?? null,
        botWindowId: data.botWindowId ?? null,
        dmIndex:     data.dmIndex     ?? 0,
        dmPhase:     data.dmPhase     ?? 'inbox',
    };
}
async function setState(patch) {
    await chrome.storage.session.set(patch);
}

// -------------------------------------------------------
// POPUP MESSAGES
// -------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start_master') {
        handleStart().then(() => sendResponse({status: 'started'}));
    } else if (request.action === 'stop_master') {
        handleStop().then(() => sendResponse({status: 'stopped'}));
    } else if (request.action === 'save_link') {
        saveToSupabase(request.url, request.tag || 'dm_link');
    }
    return true;
});

async function handleStart() {
    const state = await getState();
    if (state.isRunning) return;
    await setState({isRunning: true});
    await openBotWindow();
    // Schedule the first cycle via alarm (survives service worker restarts)
    chrome.alarms.create('bot_cycle', {delayInMinutes: 0.25}); // first run in 15 sec
}

async function handleStop() {
    await setState({isRunning: false, dmIndex: 0, dmPhase: 'inbox'});
    chrome.alarms.clear('bot_cycle');
    const state = await getState();
    if (state.botWindowId) {
        chrome.windows.remove(state.botWindowId).catch(() => {});
        await setState({botWindowId: null, reelsTabId: null, dmsTabId: null});
    }
}

// -------------------------------------------------------
// ALARM HANDLER — fires every cycle, wakes up service worker
// -------------------------------------------------------
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'bot_cycle') return;

    const state = await getState();
    if (!state.isRunning) return;

    console.log("[Master] Alarm fired — running cycle");
    await runCycle(state);

    // Schedule next cycle (1.5 minutes between cycles to be human-like)
    const nextDelay = 1 + Math.random() * 0.5; // 1.0–1.5 minutes
    chrome.alarms.create('bot_cycle', {delayInMinutes: nextDelay});
});

// -------------------------------------------------------
// BOT WINDOW — opens a dedicated popup for Instagram
// -------------------------------------------------------
async function openBotWindow() {
    const s = await getState();

    // Check if we already have valid tabs
    if (s.reelsTabId && s.dmsTabId) {
        try {
            await chrome.tabs.get(s.reelsTabId);
            await chrome.tabs.get(s.dmsTabId);
            return; // Both tabs still exist, reuse them
        } catch(e) {} // One was closed, fall through to create
    }

    // Find existing Instagram tabs in any window
    const allTabs = await chrome.tabs.query({url: '*://*.instagram.com/*'});
    const reelsTab = allTabs.find(t => t.url.includes('/reels/'));
    const dmTab = allTabs.find(t => t.url.includes('/direct/'));

    if (reelsTab) {
        await setState({reelsTabId: reelsTab.id});
        console.log('[Master] Found existing Reels tab:', reelsTab.id);
    } else {
        const t = await chrome.tabs.create({url: 'https://www.instagram.com/reels/', active: false});
        await setState({reelsTabId: t.id});
        await delay(8000);
    }

    if (dmTab) {
        await setState({dmsTabId: dmTab.id});
        console.log('[Master] Found existing DM tab:', dmTab.id);
    } else {
        const freshState = await getState();
        const t = await chrome.tabs.create({
            url: 'https://www.instagram.com/direct/',
            active: false
        });
        await setState({dmsTabId: t.id});
        await delay(6000);
    }

    console.log('[Master] Tabs ready.');
}

// -------------------------------------------------------
// MAIN CYCLE
// -------------------------------------------------------
async function runCycle(state) {
    // Re-open window if it was closed
    await openBotWindow();
    const s = await getState();

    // --- Reel ---
    if (s.reelsTabId) {
        try { await doOneReel(s.reelsTabId); }
        catch (e) { console.error("[Master] Reel error:", e); }
    }

    // --- DM ---
    if (s.dmsTabId) {
        try { await doOneDMCheck(s); }
        catch (e) { console.error("[Master] DM error:", e); }
    }
}

// -------------------------------------------------------
// REEL ACTION
// -------------------------------------------------------
async function doOneReel(tabId) {
    const comment = COMMENTS[Math.floor(Math.random() * COMMENTS.length)];

    // Step 1: analyse, follow, open comment box
    const r1 = await chrome.scripting.executeScript({
        target: {tabId},
        func: reelStep1_FollowAndOpenComment,
        args: [ALL_KEYWORDS, comment],
        world: 'MAIN'
    });
    const step1 = r1?.[0]?.result || {};
    console.log("[Master] Reel step1:", step1);

    if (step1.relevant && step1.commentBoxOpened) {
        // Increased to 4s — comment box animation needs time to fully open
        await delay(4000);
        const r2 = await chrome.scripting.executeScript({
            target: {tabId},
            func: reelStep2_TypeAndPost,
            args: [comment],
            world: 'MAIN'
        });
        console.log("[Master] Reel step2 (comment):", r2?.[0]?.result);
        await delay(4000);
    }

    // Scroll to next
    await delay(3000);
    await chrome.scripting.executeScript({
        target: {tabId},
        func: scrollToNextReel,
        world: 'MAIN'
    });
}

// -------------------------------------------------------
// DM ACTION
// -------------------------------------------------------
async function doOneDMCheck(state) {
    const {dmsTabId, dmIndex, dmPhase} = state;
    const dmUrl = dmPhase === 'inbox'
        ? 'https://www.instagram.com/direct/'
        : 'https://www.instagram.com/direct/requests/';

    await chrome.tabs.update(dmsTabId, {url: dmUrl});
    await delay(5000);

    const r = await chrome.scripting.executeScript({
        target: {tabId: dmsTabId},
        func: dmAction,
        args: [dmIndex, dmPhase],
        world: 'MAIN'
    });
    const result = r?.[0]?.result || {};
    console.log("[Master] DM result:", result);

    if (result.noMoreThreads) {
        await setState({dmIndex: 0, dmPhase: dmPhase === 'inbox' ? 'requests' : 'inbox'});
    } else {
        await setState({dmIndex: dmIndex + 1});
    }

    await delay(5000);
}

// -------------------------------------------------------
// PAGE FUNCTIONS — injected via chrome.scripting
// -------------------------------------------------------
function reelStep1_FollowAndOpenComment(keywords, comment) {
    let caption = "";
    document.querySelectorAll('h1, span[dir="auto"], div[dir="auto"]').forEach(el => {
        if (el.textContent.trim().length > caption.length) caption = el.textContent.trim();
    });

    const isRelevant = keywords.some(kw => caption.toLowerCase().includes(kw.toLowerCase()));
    if (!isRelevant) return {relevant: false, caption: caption.substring(0, 80)};

    // Follow
    try {
        const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
        const followBtn = btns.find(b => b.textContent.trim() === 'Follow');
        if (followBtn) followBtn.click();
    } catch(e) {}

    // Open comment box
    let commentBoxOpened = false;
    try {
        const svgs = document.querySelectorAll('svg[aria-label="Comment"]');
        if (svgs.length > 0) {
            let el = svgs[svgs.length - 1];
            for (let i = 0; i < 6; i++) {
                if (!el.parentElement) break;
                el = el.parentElement;
                if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
                    el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
                    commentBoxOpened = true;
                    break;
                }
            }
        }
    } catch(e) {}

    return {relevant: true, caption: caption.substring(0, 80), commentBoxOpened};
}

async function reelStep2_TypeAndPost(comment) {
    try {
        // Instagram comment box is a contenteditable DIV with role="textbox"
        // NOT an <input> or <textarea>
        // Wait up to 5 seconds for the comment box to fully appear
        let box = null;
        for (let attempt = 0; attempt < 10; attempt++) {
            box = document.querySelector('div[role="textbox"]')
               || document.querySelector('div[contenteditable="true"]')
               || document.querySelector('[contenteditable="true"]');
            if (box) break;
            await new Promise(r => setTimeout(r, 500));
        }

        if (!box) return {success: false, reason: 'no textbox found after retries'};

        // Focus and move cursor to end using Range API
        box.focus();
        const range = document.createRange();
        range.selectNodeContents(box);
        range.collapse(false); // collapse to end
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        // Insert text at cursor (most reliable method for contenteditable)
        document.execCommand('insertText', false, comment);

        // Wait then find and click Post button
        setTimeout(() => {
            // Post button appears after text is entered
            const allBtns = Array.from(document.querySelectorAll('div[role="button"]'));
            const postBtn = allBtns.find(b => b.textContent.trim() === 'Post');
            if (postBtn) {
                postBtn.click();
                console.log('[InstaBot] Comment posted!');
                // Close comment panel if needed
                setTimeout(() => {
                    const closeBtn = document.querySelector('svg[aria-label="Close"]');
                    if (closeBtn) {
                        let el = closeBtn;
                        for (let i = 0; i < 5; i++) {
                            if (!el.parentElement) break;
                            el = el.parentElement;
                            if (el.getAttribute('role') === 'button') { el.click(); break; }
                        }
                    }
                }, 2000);
            } else {
                console.warn('[InstaBot] Post button not found. Buttons:', 
                    allBtns.map(b => b.textContent.trim()).filter(t => t));
            }
        }, 1000);

        return {success: true, comment};
    } catch(e) {
        return {success: false, reason: e.message};
    }
}

function scrollToNextReel() {
    // Try visible down-arrow chevron first
    try {
        const chevrons = document.querySelectorAll('svg[aria-label="Next"]');
        if (chevrons.length > 0) {
            let el = chevrons[chevrons.length - 1];
            for (let i = 0; i < 6; i++) {
                if (!el.parentElement) break;
                el = el.parentElement;
                if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
                    el.click();
                    return {method: 'chevron'};
                }
            }
        }
    } catch(e) {}

    // Find snap scroll container
    try {
        for (const div of document.querySelectorAll('div')) {
            const cs = getComputedStyle(div);
            if ((cs.overflowY === 'scroll' || cs.overflowY === 'auto') && div.scrollHeight > div.clientHeight + 100) {
                div.scrollTop += div.clientHeight;
                return {method: 'container'};
            }
        }
    } catch(e) {}

    // Keyboard fallback
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowDown', keyCode:40, bubbles:true}));
    return {method: 'keyboard'};
}

function dmAction(index, phase) {
    const threads = document.querySelectorAll('div[role="listitem"]');
    if (!threads.length || index >= threads.length) return {noMoreThreads: true};
    threads[index].click();
    setTimeout(() => {
        if (phase === 'requests') {
            const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
            const accept = btns.find(b => b.textContent.trim() === 'Accept');
            if (accept) {
                accept.click();
                setTimeout(() => {
                    const ok = Array.from(document.querySelectorAll('div[role="button"], button'))
                        .find(b => ['Primary','General'].includes(b.textContent.trim()));
                    if (ok) ok.click();
                }, 1500);
            }
        }
    }, 2500);
    return {noMoreThreads: false, index};
}

// -------------------------------------------------------
// SUPABASE
// -------------------------------------------------------
async function saveToSupabase(linkUrl, tag) {
    try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/extracted_links`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({url: linkUrl, tag, created_at: new Date().toISOString()})
        });
        if (r.ok) console.log("[Master] Saved:", linkUrl, "tag:", tag);
        else console.error("[Master] Supabase error:", await r.text());
    } catch(e) { console.error("[Master] Supabase error:", e); }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
