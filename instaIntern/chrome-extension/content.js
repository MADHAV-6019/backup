// -------------------------------------------------------
// NETWORK INTERCEPTOR — inject into page context once
// -------------------------------------------------------
if (!window.__instaBotInjected) {
    window.__instaBotInjected = true;

    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('inject.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);

    // Forward intercepted links to background.js
    window.addEventListener('message', (event) => {
        if (!event.data || event.data.type !== 'INSTA_INTERCEPT') return;
        const data = event.data.data;
        const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*/g;
        const all = data.match(urlRegex) || [];
        const filtered = [...new Set(all.filter(u =>
            !u.includes('instagram.com') && !u.includes('fbcdn.net') &&
            !u.includes('cdninstagram.com') && !u.includes('meta.com') &&
            !u.includes('whatsapp.com')
        ))];
        filtered.forEach(url => chrome.runtime.sendMessage({action: 'save_link', url, tag: 'dm_link'}));
    });
}

// -------------------------------------------------------
// AUTO-SCROLL ON REEL END — runs on every instagram.com page
// -------------------------------------------------------
if (window.location.href.includes('/reels/') || window.location.href.includes('instagram.com')) {
    startVideoWatcher();
}

function scrollToNext() {
    // Method 1: Click the visible down-chevron (▼) button
    const chevrons = document.querySelectorAll('svg[aria-label="Next"]');
    if (chevrons.length > 0) {
        let el = chevrons[chevrons.length - 1];
        for (let i = 0; i < 6; i++) {
            if (!el.parentElement) break;
            el = el.parentElement;
            if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
                el.click();
                console.log('[InstaBot] Scrolled via chevron button');
                return;
            }
        }
    }

    // Method 2: Find Instagram's snap-scroll container
    for (const div of document.querySelectorAll('div')) {
        const cs = getComputedStyle(div);
        if ((cs.overflowY === 'scroll' || cs.overflowY === 'auto') && div.scrollHeight > div.clientHeight + 100) {
            div.scrollTop += div.clientHeight;
            console.log('[InstaBot] Scrolled via container');
            return;
        }
    }

    // Method 3: Keyboard fallback
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', keyCode: 40, bubbles: true}));
    console.log('[InstaBot] Scrolled via keyboard');
}

let watchedVideo = null;

function attachVideoEndListener(video) {
    if (!video || video === watchedVideo) return;
    watchedVideo = video;
    console.log('[InstaBot] Attached ended listener to video');

    video.addEventListener('ended', () => {
        console.log('[InstaBot] Video ended — scrolling to next');
        // Small delay so Instagram has time to register the end
        setTimeout(scrollToNext, 800);
    }, {once: true}); // once:true auto-removes after firing
}

function startVideoWatcher() {
    // Attach to any video currently on the page
    const current = document.querySelector('video');
    if (current) attachVideoEndListener(current);

    // Watch for new videos being added (when scrolling to next reel)
    const observer = new MutationObserver(() => {
        const video = document.querySelector('video');
        if (video && video !== watchedVideo) {
            attachVideoEndListener(video);
        }
    });

    observer.observe(document.body, {childList: true, subtree: true});
    console.log('[InstaBot] Video watcher started');
}
