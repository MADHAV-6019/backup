// Teledown Premium - Service Worker Orchestrator

// Media cache stored per active browser tab
const activeTabMedia = {};

// Messaging routing listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Determine target tab ID
  let tabId = sender.tab?.id;
  
  // If request comes from popup, get currently active tab
  if (!tabId && (message.type === 'GET_MEDIA' || message.type === 'CLEAR_MEDIA' || message.type === 'DELETE_ITEM' || message.type === 'DOWNLOAD_BLOB_IN_TAB')) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      if (activeTab) {
        processMessage(message, activeTab.id, sendResponse);
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true; // Keep channel open for async response
  }

  processMessage(message, tabId, sendResponse);
  return true; // Keep channel open for async response
});

// Primary message router helper
function processMessage(message, tabId, sendResponse) {
  if (!tabId) {
    sendResponse({ error: 'Missing tab association context' });
    return;
  }

  // 1. Sniffed Media Found
  if (message.type === 'MEDIA_FOUND') {
    if (!activeTabMedia[tabId]) activeTabMedia[tabId] = [];
    
    const existingUrls = new Set(activeTabMedia[tabId].map(m => m.url));
    const newItems = message.items.filter(item => !existingUrls.has(item.url));
    
    if (newItems.length > 0) {
      activeTabMedia[tabId].push(...newItems);
      updateTabBadge(tabId);
    }
    sendResponse({ success: true, count: activeTabMedia[tabId].length });
  }

  // 2. Fetch Sniffed Media List
  else if (message.type === 'GET_MEDIA') {
    sendResponse({ items: activeTabMedia[tabId] || [] });
  }

  // 3. Delete Specific Media Row
  else if (message.type === 'DELETE_ITEM') {
    if (activeTabMedia[tabId]) {
      activeTabMedia[tabId] = activeTabMedia[tabId].filter(m => m.url !== message.url);
      updateTabBadge(tabId);
    }
    sendResponse({ success: true });
  }

  // 4. Clear Sniffed Media Cache
  else if (message.type === 'CLEAR_MEDIA') {
    activeTabMedia[tabId] = [];
    updateTabBadge(tabId);
    sendResponse({ success: true });
  }

  // 5. Trigger Single File Download
  else if (message.type === 'DOWNLOAD_FILE') {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename || `teledown_file_${Date.now()}`,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
  }

  // 6. Bulk Batch Downloads
  else if (message.type === 'DOWNLOAD_ALL') {
    const items = activeTabMedia[tabId] || [];
    let started = 0;
    
    items.forEach((item, index) => {
      // Delay intervals to prevent browser thread locks
      setTimeout(() => {
        chrome.downloads.download({
          url: item.url,
          filename: item.filename || `teledown_${index + 1}_${Date.now()}`,
          saveAs: false
        });
        started++;
        if (started === items.length) {
          sendResponse({ success: true, started });
        }
      }, index * 250);
    });
  }

  // 7. Core Native Nucleus: Download Blob inside Main World Context
  else if (message.type === 'DOWNLOAD_BLOB_IN_TAB') {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (url, filename) => {
        try {
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

          // If the URL is a video blob, it is a MediaSource and cannot be saved via simple link clicks.
          // We bypass this by executing a native download button click or opening the video in the viewer.
          if (url.startsWith('blob:') && (url.includes('video') || filename.toLowerCase().endsWith('.mp4'))) {
            // Find the video element with this blob source
            let videoEl = Array.from(document.querySelectorAll('video')).find(el => el.src === url);
            if (videoEl) {
              // Check if media viewer is already showing this video
              let nativeBtn = findNativeDownloadButton();
              if (nativeBtn) {
                nativeBtn.classList.remove('hide', 'hidden', 'invisible');
                nativeBtn.style.display = 'flex';
                nativeBtn.click();
              } else {
                // Find nearest clickable container wrapper to trigger Media Viewer opening (rather than video directly which plays/pauses)
                let container = videoEl.closest('.media-photo, .video-wrapper, .album-item, .video-container, .attachment-video, .MessagePhoto, .media-wrapper') || videoEl.parentElement || videoEl;
                container.click();
                
                // Wait for viewer to mount, click download, then close it
                setTimeout(() => {
                  let activeNativeBtn = findNativeDownloadButton();
                  if (activeNativeBtn) {
                    activeNativeBtn.classList.remove('hide', 'hidden', 'invisible');
                    activeNativeBtn.style.display = 'flex';
                    activeNativeBtn.click();
                    
                    // Close the viewer automatically after 1 second
                    setTimeout(() => {
                      let closeBtn = findNativeCloseButton();
                      if (closeBtn) closeBtn.click();
                    }, 1000);
                  }
                }, 350);
              }
              return;
            }
          }

          // Fallback/Default for Photos, static blobs, and other media
          const a = document.createElement('a');
          a.href = url;
          a.download = filename || 'telegram_file';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
          }, 150);
        } catch (e) {
          console.error('Teledown main world download block:', e);
        }
      },
      args: [message.url, message.filename],
      world: 'MAIN'
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('executeScript failed:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
  }
}

// Update Action Badge with count of captured files
function updateTabBadge(tabId) {
  const count = activeTabMedia[tabId]?.length || 0;
  chrome.action.setBadgeText({ 
    text: count > 0 ? String(count) : '', 
    tabId 
  });
  chrome.action.setBadgeBackgroundColor({ 
    color: '#229ED9', // Telegram Blue
    tabId 
  });
}

// Clear media caches when tabs are closed to free memory leaks
chrome.tabs.onRemoved.addListener((tabId) => {
  delete activeTabMedia[tabId];
});

// Clear cache if user navigates away from Telegram Web
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && !changeInfo.url.includes('web.telegram.org')) {
    delete activeTabMedia[tabId];
    chrome.action.setBadgeText({ text: '', tabId });
  }
});
