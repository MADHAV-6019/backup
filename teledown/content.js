// Teledown Premium - Content Snipper & DOM Injector Script

(function () {
  'use strict';

  const capturedUrls = new Set();
  let observer = null;

  // ─── UTILITIES ───────────────────────────────────────────────────────────────

  function getFilename(url, type, index) {
    const ts = Date.now();
    const ext = { video: 'mp4', photo: 'jpg', gif: 'gif', audio: 'mp3', document: 'zip' }[type] || 'dat';
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      const last = parts[parts.length - 1];
      if (last && last.includes('.')) {
        // Clean filename from url parameters
        const cleaned = last.split('?')[0];
        if (cleaned.length > 3) return `teledown_${cleaned}`;
      }
    } catch (e) {}
    return `teledown_${type}_${ts}_${index}.${ext}`;
  }

  function detectType(url, el) {
    if (!url) return null;
    if (url.match(/\.(mp4|webm|mov|avi|mkv)/i)) return 'video';
    if (url.match(/\.(jpg|jpeg|png|webp)/i)) return 'photo';
    if (url.match(/\.(gif)/i)) return 'gif';
    if (url.match(/\.(mp3|ogg|opus|aac|m4a|flac)/i)) return 'audio';
    
    if (el) {
      const tag = el.tagName?.toLowerCase();
      if (tag === 'video') return 'video';
      if (tag === 'audio') return 'audio';
      if (tag === 'img') return 'photo';
    }
    return null;
  }

  // Estimate file sizes if not provided (visual placeholder)
  function estimateBytes(type) {
    const minMax = {
      video: [1500000, 28000000],  // 1.5MB to 28MB
      photo: [250000, 2800000],    // 250KB to 2.8MB
      gif: [500000, 4500000],      // 500KB to 4.5MB
      audio: [400000, 8500000],    // 400KB to 8.5MB
      document: [100000, 15000000] // 100KB to 15MB
    };
    const bounds = minMax[type] || [500000, 5000000];
    return Math.floor(Math.random() * (bounds[1] - bounds[0])) + bounds[0];
  }

  // ─── MEDIA SNIFFING ENGINE ───────────────────────────────────────────────────

  function scanForMedia() {
    const found = [];
    let idx = 0;

    // 1. Video elements with direct sources
    document.querySelectorAll('video[src], video source[src]').forEach(el => {
      const url = el.src || el.getAttribute('src');
      if (url && (url.startsWith('http') || url.startsWith('blob:')) && !capturedUrls.has(url)) {
        capturedUrls.add(url);
        found.push({
          url,
          type: 'video',
          filename: getFilename(url, 'video', ++idx),
          thumbnail: null,
          size: estimateBytes('video')
        });
      }
    });

    // 2. Video elements streaming via blob URLs
    document.querySelectorAll('video').forEach(el => {
      const url = el.src;
      if (url && url.startsWith('blob:') && !capturedUrls.has(url)) {
        capturedUrls.add(url);
        found.push({
          url,
          type: 'video',
          filename: `teledown_video_${Date.now()}_${++idx}.mp4`,
          thumbnail: null,
          size: estimateBytes('video')
        });
      }
    });

    // 3. Audio / Voice messages
    document.querySelectorAll('audio[src], audio source[src]').forEach(el => {
      const url = el.src || el.getAttribute('src');
      if (url && (url.startsWith('http') || url.startsWith('blob:')) && !capturedUrls.has(url)) {
        capturedUrls.add(url);
        found.push({
          url,
          type: 'audio',
          filename: getFilename(url, 'audio', ++idx),
          thumbnail: null,
          size: estimateBytes('audio')
        });
      }
    });

    // 4. Photos inside message chat bubbles (Compatible with K and A)
    const photoSelectors = [
      '.media-photo img',
      '.attachment-photo img',
      '.message-media img',
      '.photo-container img',
      '.album-item img',
      '.media-viewer-aspecter img',
      '.MessagePhoto img',
      '.media-wrapper img',
      'img.media-photo'
    ];
    document.querySelectorAll(photoSelectors.join(',')).forEach(el => {
      const url = el.src || el.getAttribute('src');
      if (url && (url.startsWith('http') || url.startsWith('blob:')) && !capturedUrls.has(url) && !url.includes('emoji')) {
        capturedUrls.add(url);
        found.push({
          url,
          type: 'photo',
          filename: getFilename(url, 'photo', ++idx),
          thumbnail: url,
          size: estimateBytes('photo')
        });
      }
    });

    // 5. CSS Background images (covers thumbnails and avatar assets)
    document.querySelectorAll('[style*="background-image"]').forEach(el => {
      const style = el.getAttribute('style') || '';
      const match = style.match(/url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/) || style.match(/url\(['"]?(blob:[^'")\s]+)['"]?\)/);
      if (match) {
        const url = match[1];
        if (!capturedUrls.has(url) && !url.includes('emoji') && !url.includes('avatar')) {
          const type = detectType(url, null) || 'photo';
          capturedUrls.add(url);
          found.push({
            url,
            type,
            filename: getFilename(url, type, ++idx),
            thumbnail: type === 'photo' ? url : null,
            size: estimateBytes(type)
          });
        }
      }
    });

    // Send Sniffed items to background cache
    if (found.length > 0) {
      chrome.runtime.sendMessage({ type: 'MEDIA_FOUND', items: found });
    }
  }

  // ─── PREMIUM OVERLAY BUTTON INJECTIONS ────────────────────────────────────────

  function addInPageDownloadButtons() {
    // 1. Hover overlay buttons for Image message wrappers
    const hoverTargets = [
      '.media-photo',
      '.attachment-photo',
      '.album-item',
      '.MessagePhoto',
      '.media-wrapper',
      '.video-container',
      '.attachment-video',
      '.video-wrapper'
    ];
    
    document.querySelectorAll(hoverTargets.join(',')).forEach(container => {
      if (container.dataset.teledownBtn) return;
      
      const img = container.querySelector('img');
      const video = container.querySelector('video');
      
      const srcUrl = img?.src || video?.src;
      if (!srcUrl || (!srcUrl.startsWith('http') && !srcUrl.startsWith('blob:')) || srcUrl.includes('emoji')) return;

      container.dataset.teledownBtn = '1';
      
      // Force position relative to anchor overlays
      if (window.getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }

      const type = video ? 'video' : 'photo';
      const btn = document.createElement('button');
      btn.className = `teledown-hover-btn tgd-btn-${type}`;
      btn.title = `Save Telegram ${type}`;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`;
      
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        btn.classList.add('downloading');
        btn.innerHTML = `<svg class="spin-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
        
        if (type === 'video') {
          // Native helper to locate the download button
          const findNativeDownloadButton = () => {
            let b = document.querySelector('.media-viewer-topbar button.tgico-download') ||
                    document.querySelector('.media-viewer-topbar button[title*="Download"]') ||
                    document.querySelector('.media-viewer-topbar button[title*="Save"]');
            if (!b) {
              b = document.querySelector('#MediaViewer button[title*="Download"]') ||
                  document.querySelector('#MediaViewer button.tel-download') ||
                  document.querySelector('.MediaViewerActions button[title*="Download"]');
            }
            if (!b) {
              const allButtons = Array.from(document.querySelectorAll('button'));
              b = allButtons.find(btnEl => {
                const title = (btnEl.getAttribute('title') || '').toLowerCase();
                const ariaLabel = (btnEl.getAttribute('aria-label') || '').toLowerCase();
                const text = (btnEl.textContent || '');
                return title.includes('download') || 
                       ariaLabel.includes('download') || 
                       title.includes('save') ||
                       text.includes('\ue979') ||
                       btnEl.classList.contains('tgico-download');
              });
            }
            return b;
          };

          // Native helper to locate the close button
          const findNativeCloseButton = () => {
            let b = document.querySelector('.media-viewer-topbar button.tgico-close') ||
                    document.querySelector('.media-viewer-topbar button[title*="Close"]') ||
                    document.querySelector('#MediaViewer button.btn-close') ||
                    document.querySelector('#MediaViewer button[title*="Close"]');
            if (!b) {
              const allButtons = Array.from(document.querySelectorAll('button'));
              b = allButtons.find(btnEl => {
                const title = (btnEl.getAttribute('title') || '').toLowerCase();
                const ariaLabel = (btnEl.getAttribute('aria-label') || '').toLowerCase();
                return title.includes('close') || ariaLabel.includes('close') || btnEl.classList.contains('tgico-close');
              });
            }
            return b;
          };

          let nativeBtn = findNativeDownloadButton();
          if (nativeBtn) {
            nativeBtn.classList.remove('hide', 'hidden', 'invisible');
            nativeBtn.style.display = 'flex';
            nativeBtn.click();
            resetButtonSuccess();
          } else {
            // Click container wrapper to trigger Telegram Media Viewer opening (rather than the video element directly which just plays/pauses)
            const clickTarget = container.querySelector('.media-photo, .video-wrapper, .album-item') || container;
            clickTarget.click();
            
            // Wait for viewer to mount, trigger download, then close it
            setTimeout(() => {
              const activeNativeBtn = findNativeDownloadButton();
              if (activeNativeBtn) {
                activeNativeBtn.classList.remove('hide', 'hidden', 'invisible');
                activeNativeBtn.style.display = 'flex';
                activeNativeBtn.click();
                
                setTimeout(() => {
                  let closeBtn = findNativeCloseButton();
                  if (closeBtn) closeBtn.click();
                }, 1000);
              }
              resetButtonSuccess();
            }, 350);
          }
        } else {
          // Photos or static blobs can be downloaded via direct background script injection
          triggerInPageDownload(srcUrl, `teledown_${type}_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`);
          resetButtonSuccess();
        }
        
        function resetButtonSuccess() {
          setTimeout(() => {
            btn.classList.remove('downloading');
            btn.classList.add('done');
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
            
            setTimeout(() => {
              btn.classList.remove('done');
              btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`;
            }, 2000);
          }, 1200);
        }
      });

      container.appendChild(btn);
    });

    // 2. Inline download buttons for Audio / Voice Notes
    const audioTargets = [
      '.audio-player',
      '.audio-msg',
      '.voice-message',
      '.Audio',
      '.audio-message'
    ];
    document.querySelectorAll(audioTargets.join(',')).forEach(audioCont => {
      if (audioCont.dataset.teledownBtn) return;
      
      const audioEl = audioCont.querySelector('audio');
      if (!audioEl || !audioEl.src) return;
      
      audioCont.dataset.teledownBtn = '1';

      const audioBtn = document.createElement('button');
      audioBtn.className = 'teledown-audio-inline-btn';
      audioBtn.title = 'Save audio track';
      audioBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`;
      
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        audioBtn.classList.add('active');
        triggerInPageDownload(audioEl.src, `teledown_audio_${Date.now()}.mp3`);
        
        setTimeout(() => {
          audioBtn.classList.remove('active');
        }, 2000);
      });
      
      // Append right next to audio play/controls wrapper
      const controls = audioCont.querySelector('.audio-player-controls, .controls, .play-wrapper, .voice-play-control');
      if (controls) {
        controls.parentElement.insertBefore(audioBtn, controls.nextSibling);
      } else {
        audioCont.appendChild(audioBtn);
      }
    });
  }

  // ─── SIDEBAR CARD INJECTION (CHANNEL HUB) ────────────────────────────────────

  function addSidebarBatchPanel() {
    // Detect sidebar panel for K and A
    const sidebar = document.querySelector('.RightCol, .ChatInfo, .sidebar-header, #column-right, .right-column');
    if (!sidebar || sidebar.querySelector('.teledown-sidebar-card')) return;

    const hubCard = document.createElement('div');
    hubCard.className = 'teledown-sidebar-card';
    hubCard.innerHTML = `
      <div class="teledown-hub-header">
        <span class="hub-logo-dot animate-pulse"></span>
        <h4 class="hub-title">Teledown Hub</h4>
      </div>
      <p class="hub-description">Aggregate and batch download all files, images, and videos loaded in this chat view.</p>
      <button class="btn-hub-extract" id="teledownExtractBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        Extract All Media
      </button>
    `;

    // Extract action crawls through viewport
    hubCard.querySelector('#teledownExtractBtn').addEventListener('click', () => {
      const btn = hubCard.querySelector('#teledownExtractBtn');
      btn.disabled = true;
      btn.innerHTML = `<svg class="spin-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Scanning chat...`;

      // Trigger multi scroll down/up loading simulation or immediate sniffer grab
      scanForMedia();

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> Media Synced!`;
        
        setTimeout(() => {
          btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Extract All Media`;
        }, 2000);
      }, 1500);
    });

    // Insert at top of sidebar container
    if (sidebar.firstChild) {
      sidebar.insertBefore(hubCard, sidebar.firstChild);
    } else {
      sidebar.appendChild(hubCard);
    }
  }

  // ─── NATIVE NUCLEUS: BYPASS RESTRICTION BLOCKERS ──────────────────────────────

  // Trigger download inside main world context via background scripting API (bypasses isolated world blob locks)
  function triggerInPageDownload(url, filename) {
    try {
      chrome.runtime.sendMessage({
        type: 'DOWNLOAD_BLOB_IN_TAB',
        url: url,
        filename: filename
      });
      return true;
    } catch (e) {
      console.error('Message trigger to background worker failed:', e);
      return false;
    }
  }

  // ─── NATIVE NUCLEUS: UNHIDE HIDDEN RESTRICTED BUTTONS ────────────────────────
  function unhideNativeButtons() {
    // 1. Web K media viewer topbar hidden buttons
    document.querySelectorAll('.media-viewer-topbar button.btn-icon.hide, .media-viewer-topbar button.hide').forEach(btn => {
      btn.classList.remove('hide');
      btn.style.display = 'flex';
      btn.style.visibility = 'visible';
    });

    // 2. Web A / MediaViewerActions hidden buttons
    document.querySelectorAll('#MediaViewer button.hide, #MediaViewer .MediaViewerActions button.hide').forEach(btn => {
      btn.classList.remove('hide');
      btn.style.display = 'flex';
      btn.style.visibility = 'visible';
    });
  }

  // ─── MUTATION OBSERVER & POLLING REGISTRATION ─────────────────────────────────

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      scanForMedia();
      addInPageDownloadButtons();
      addSidebarBatchPanel();
      unhideNativeButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    // Repeated poll to search wrapper app load
    const waitForApp = setInterval(() => {
      const app = document.querySelector('#app, .app-body, .bubbles, .MainLayout, .chat-list');
      if (app) {
        clearInterval(waitForApp);
        scanForMedia();
        addInPageDownloadButtons();
        addSidebarBatchPanel();
        unhideNativeButtons();
        startObserver();
      }
    }, 500);

    // Hard fallback backup load
    setTimeout(() => {
      clearInterval(waitForApp);
      scanForMedia();
      addInPageDownloadButtons();
      addSidebarBatchPanel();
      unhideNativeButtons();
      startObserver();
    }, 3000);
  }

  // XHR Interception hook for reactive sniffing
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0]?.toString() || '';
    if (url.includes('telegram') && (url.includes('video') || url.includes('media') || url.includes('stream'))) {
      setTimeout(scanForMedia, 200);
    }
    return response;
  };

  // DOM Start register
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
