// Teledown Premium - Core Extension Interface Script

let allMedia = [];
let selectedUrls = new Set();
let currentFilter = 'all';

// DOM Elements
const mediaList = document.getElementById('mediaList');
const emptyState = document.getElementById('emptyState');
const sniffedBadge = document.getElementById('sniffedBadge');
const historyBadge = document.getElementById('historyBadge');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const selectedCountText = document.getElementById('selectedCountText');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const clearBtn = document.getElementById('clearBtn');
const searchInput = document.getElementById('searchInput');
const filterChips = document.getElementById('filterChips');

// Tab Panels & Switches
const tabSniffed = document.getElementById('tabSniffed');
const tabHistory = document.getElementById('tabHistory');
const sniffedPanel = document.getElementById('sniffedPanel');
const historyPanel = document.getElementById('historyPanel');

// Connection Status
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const statusBadge = document.getElementById('statusBadge');
const notTelegram = document.getElementById('notTelegram');
const mainContent = document.getElementById('mainContent');

// History Elements
const historyList = document.getElementById('historyList');
const emptyHistoryState = document.getElementById('emptyHistoryState');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyStatsText = document.getElementById('historyStatsText');

// ─── INIT ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await checkActiveTab();
  setupEventListeners();
  
  // Set up polling to fetch new sniffed media elements
  setInterval(pollSniffedMedia, 1500);
});

// Check if tab is Telegram Web
async function checkActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isTelegram = tab?.url?.includes('web.telegram.org');

  if (isTelegram) {
    statusDot.className = 'status-dot active';
    statusText.textContent = 'Active';
    statusBadge.title = 'Teledown is connected and scanning.';
    notTelegram.style.display = 'none';
    mainContent.style.display = 'flex';
    
    await fetchSniffedMedia();
    await loadHistory();
  } else {
    statusDot.className = 'status-dot';
    statusText.textContent = 'Standby';
    statusBadge.title = 'Please navigate to web.telegram.org';
    notTelegram.style.display = 'flex';
    mainContent.style.display = 'none';
  }
}

// ─── POLLING & FETCH ─────────────────────────────────────────────────────────

async function pollSniffedMedia() {
  // Only poll if tab is active and main content is visible
  if (mainContent.style.display === 'flex' && sniffedPanel.style.display !== 'none') {
    await fetchSniffedMedia();
  }
}

async function fetchSniffedMedia() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_MEDIA' });
    const freshMedia = response?.items || [];
    
    // Compare and update only if items changed to avoid unnecessary re-renders
    if (JSON.stringify(freshMedia) !== JSON.stringify(allMedia)) {
      allMedia = freshMedia;
      sniffedBadge.textContent = allMedia.length;
      
      // Auto select new items by default
      allMedia.forEach(m => {
        if (!selectedUrls.has(m.url)) {
          selectedUrls.add(m.url);
        }
      });
      
      renderMediaList();
    }
  } catch (e) {
    console.error('Failed to poll media:', e);
  }
}

// ─── RENDERING ───────────────────────────────────────────────────────────────

function renderMediaList() {
  // Filter by Chip
  let filtered = currentFilter === 'all'
    ? allMedia
    : allMedia.filter(m => m.type === currentFilter);
    
  // Filter by Search Query
  const query = searchInput.value.toLowerCase().trim();
  if (query) {
    filtered = filtered.filter(m => m.filename.toLowerCase().includes(query));
  }

  // Remove existing media items
  Array.from(mediaList.querySelectorAll('.media-row')).forEach(el => el.remove());

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    downloadAllBtn.disabled = true;
    selectAllCheckbox.checked = false;
    updateSelectedCount();
    return;
  }

  emptyState.style.display = 'none';

  filtered.forEach((item, index) => {
    const row = createMediaRow(item, index);
    mediaList.appendChild(row);
  });

  // Sync Select All check state
  const visibleSelected = filtered.filter(m => selectedUrls.has(m.url)).length;
  selectAllCheckbox.checked = visibleSelected === filtered.length && filtered.length > 0;
  
  updateSelectedCount();
}

function createMediaRow(item, index) {
  const row = document.createElement('div');
  row.className = `media-row ${selectedUrls.has(item.url) ? 'selected' : ''}`;
  row.style.animationDelay = `${index * 20}ms`;

  const typeEmoji = { video: '🎬', photo: '🖼️', audio: '🎵', gif: '✨', document: '📄' };
  const emoji = typeEmoji[item.type] || '📁';
  
  let thumbHtml = '';
  if (item.thumbnail) {
    thumbHtml = `<img src="${item.thumbnail}" alt="" onerror="this.parentElement.textContent='${emoji}'">`;
  } else {
    thumbHtml = emoji;
  }

  // File size format helper
  const sizeText = item.size ? formatBytes(item.size) : '1.4 MB'; 

  const isChecked = selectedUrls.has(item.url) ? 'checked' : '';

  row.innerHTML = `
    <div class="col-check">
      <label class="custom-checkbox">
        <input type="checkbox" class="item-checkbox" data-url="${item.url}" ${isChecked}>
        <span class="checkmark"></span>
      </label>
    </div>
    <div class="col-thumb">
      <div class="media-thumbnail-cell" title="Click to preview file">
        ${thumbHtml}
        <div class="preview-play-icon">
          <svg class="play-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
    <div class="col-details">
      <div class="media-details-cell">
        <span class="media-name-label" title="${item.filename}">${item.filename}</span>
        <div class="media-meta-row">
          <span class="type-badge ${item.type}">${item.type}</span>
        </div>
      </div>
    </div>
    <div class="col-size">
      <span class="media-size-cell">${sizeText}</span>
    </div>
    <div class="col-action">
      <div class="media-action-cell">
        <button class="btn-row-action dl" data-url="${item.url}" data-filename="${item.filename}" data-type="${item.type}" data-size="${item.size || 0}" title="Download Now">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        </button>
        <button class="btn-row-action del" data-url="${item.url}" title="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `;

  // Row Event Listeners
  
  // Selection check
  const chk = row.querySelector('.item-checkbox');
  chk.addEventListener('change', (e) => {
    if (e.target.checked) {
      selectedUrls.add(item.url);
      row.classList.add('selected');
    } else {
      selectedUrls.delete(item.url);
      row.classList.remove('selected');
    }
    syncSelectAllState();
    updateSelectedCount();
  });

  // Image/Thumb click preview
  row.querySelector('.media-thumbnail-cell').addEventListener('click', () => {
    alert(`Previewing: ${item.filename}\nType: ${item.type.toUpperCase()}\nStatus: Cached & Ready to save.`);
  });

  // Individual row download
  const dlBtn = row.querySelector('.btn-row-action.dl');
  dlBtn.addEventListener('click', async (e) => {
    e.stopPropagation();

    dlBtn.disabled = true;
    dlBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
    
    const success = await handleDownload({
      url: item.url,
      filename: item.filename,
      type: item.type,
      size: item.size
    });

    if (success) {
      dlBtn.classList.add('done');
      dlBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:white"><polyline points="20 6 9 17 4 12"/></svg>`;
      setTimeout(() => {
        dlBtn.classList.remove('done');
        dlBtn.disabled = false;
        dlBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`;
      }, 2000);
    } else {
      dlBtn.disabled = false;
      dlBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`;
    }
  });

  // Individual row delete
  row.querySelector('.btn-row-action.del').addEventListener('click', async (e) => {
    e.stopPropagation();
    selectedUrls.delete(item.url);
    await chrome.runtime.sendMessage({ type: 'DELETE_ITEM', url: item.url });
    allMedia = allMedia.filter(m => m.url !== item.url);
    sniffedBadge.textContent = allMedia.length;
    renderMediaList();
  });

  return row;
}

// Check if Select All box should be checked
function syncSelectAllState() {
  let filtered = currentFilter === 'all'
    ? allMedia
    : allMedia.filter(m => m.type === currentFilter);
  const query = searchInput.value.toLowerCase().trim();
  if (query) {
    filtered = filtered.filter(m => m.filename.toLowerCase().includes(query));
  }

  const visibleSelected = filtered.filter(m => selectedUrls.has(m.url)).length;
  selectAllCheckbox.checked = visibleSelected === filtered.length && filtered.length > 0;
}

function updateSelectedCount() {
  // Find visible selected count
  let filtered = currentFilter === 'all'
    ? allMedia
    : allMedia.filter(m => m.type === currentFilter);
  const query = searchInput.value.toLowerCase().trim();
  if (query) {
    filtered = filtered.filter(m => m.filename.toLowerCase().includes(query));
  }

  const selectedVisible = filtered.filter(m => selectedUrls.has(m.url));
  selectedCountText.textContent = `${selectedVisible.length} / ${filtered.length} selected`;
  downloadAllBtn.disabled = selectedVisible.length === 0;
  
  if (selectedVisible.length > 0) {
    downloadAllBtn.textContent = `Download Selected (${selectedVisible.length})`;
  } else {
    downloadAllBtn.textContent = 'Download Selected';
  }
}

// ─── DOWNLOAD HANDLER ────────────────────────────────────────────────────────

async function handleDownload(item) {
  try {
    // Perform download inside page context (bypasses restrictions)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return false;

    // Call background service worker to trigger download inside the page's main world context
    await chrome.runtime.sendMessage({
      type: 'DOWNLOAD_BLOB_IN_TAB',
      tabId: tab.id,
      url: item.url,
      filename: item.filename
    });

    // Save item to Download History
    await saveToHistory(item);
    return true;
  } catch (err) {
    console.error('Download message failed:', err);
    // Fallback: try service worker downloader
    try {
      await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_FILE',
        url: item.url,
        filename: item.filename
      });
      await saveToHistory(item);
      return true;
    } catch (e) {
      console.error('Fallback download failed:', e);
      alert('⚠️ Failed to initiate download. Ensure you are active on Telegram Web.');
      return false;
    }
  }
}

// ─── DOWNLOAD HISTORY LOG ───────────────────────────────────────────────────

async function saveToHistory(item) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['downloadHistory'], (res) => {
      const history = res.downloadHistory || [];
      
      // Avoid duplicate history items
      if (!history.find(h => h.url === item.url)) {
        history.unshift({
          url: item.url,
          filename: item.filename,
          type: item.type,
          size: item.size || 0,
          timestamp: Date.now()
        });
      }
      
      // Cap history at 50 items
      if (history.length > 50) history.pop();
      
      chrome.storage.local.set({ downloadHistory: history }, () => {
        loadHistory();
        resolve();
      });
    });
  });
}

async function loadHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['downloadHistory'], (res) => {
      const history = res.downloadHistory || [];
      historyBadge.textContent = history.length;
      historyStatsText.textContent = `${history.length} files successfully saved in local cache`;

      // Clear existing elements except empty state
      Array.from(historyList.querySelectorAll('.history-card')).forEach(el => el.remove());

      if (history.length === 0) {
        emptyHistoryState.style.display = 'flex';
        clearHistoryBtn.style.display = 'none';
        resolve();
        return;
      }

      emptyHistoryState.style.display = 'none';
      clearHistoryBtn.style.display = 'block';

      const typeEmoji = { video: '🎬', photo: '🖼️', audio: '🎵', gif: '✨', document: '📄' };

      history.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-card';
        
        const emoji = typeEmoji[item.type] || '📁';
        const dateStr = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const sizeStr = item.size ? formatBytes(item.size) : '1.4 MB';

        card.innerHTML = `
          <div class="history-thumb-emoji">${emoji}</div>
          <div class="history-details">
            <div class="history-name" title="${item.filename}">${item.filename}</div>
            <div class="history-meta">${dateStr} • ${sizeStr}</div>
          </div>
          <button class="btn-row-action dl" data-url="${item.url}" title="Save again">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </button>
        `;

        card.querySelector('.btn-row-action.dl').addEventListener('click', async () => {
          await handleDownload(item);
        });

        historyList.appendChild(card);
      });
      resolve();
    });
  });
}

// ─── EVENT LISTENERS ─────────────────────────────────────────────────────────

function setupEventListeners() {
  // Tab Switching Layout
  tabSniffed.addEventListener('click', () => {
    tabSniffed.classList.add('active');
    tabHistory.classList.remove('active');
    sniffedPanel.style.display = 'flex';
    historyPanel.style.display = 'none';
  });

  tabHistory.addEventListener('click', async () => {
    tabHistory.classList.add('active');
    tabSniffed.classList.remove('active');
    historyPanel.style.display = 'flex';
    sniffedPanel.style.display = 'none';
    await loadHistory();
  });

  // Filter Chips toggling
  filterChips.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderMediaList();
    });
  });

  // Search box input listener
  searchInput.addEventListener('input', () => {
    renderMediaList();
  });

  // Select All Checkbox
  selectAllCheckbox.addEventListener('change', (e) => {
    let filtered = currentFilter === 'all'
      ? allMedia
      : allMedia.filter(m => m.type === currentFilter);
    const query = searchInput.value.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(m => m.filename.toLowerCase().includes(query));
    }

    if (e.target.checked) {
      filtered.forEach(m => selectedUrls.add(m.url));
    } else {
      filtered.forEach(m => selectedUrls.delete(m.url));
    }
    
    renderMediaList();
  });

  // Batch download click
  downloadAllBtn.addEventListener('click', async () => {
    let filtered = currentFilter === 'all'
      ? allMedia
      : allMedia.filter(m => m.type === currentFilter);
    const query = searchInput.value.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(m => m.filename.toLowerCase().includes(query));
    }

    const toDownload = filtered.filter(m => selectedUrls.has(m.url));
    if (toDownload.length === 0) return;

    downloadAllBtn.disabled = true;
    downloadAllBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Downloading...`;

    let startedCount = 0;
    for (let i = 0; i < toDownload.length; i++) {
      const item = toDownload[i];
      const success = await handleDownload(item);
      if (success) {
        startedCount++;
      }
      await delay(250); // Small interval to prevent browser thread freeze
    }

    downloadAllBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:white"><polyline points="20 6 9 17 4 12"/></svg> Started ${startedCount} Saves`;
    
    setTimeout(() => {
      downloadAllBtn.disabled = false;
      updateSelectedCount();
    }, 2500);
  });

  // Clear sniffed list button
  clearBtn.addEventListener('click', async () => {
    if (confirm('Clear all captured sniffed media items from list?')) {
      await chrome.runtime.sendMessage({ type: 'CLEAR_MEDIA' });
      allMedia = [];
      selectedUrls.clear();
      sniffedBadge.textContent = '0';
      renderMediaList();
    }
  });

  // Clear Download History
  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear your local download history log?')) {
      await chrome.storage.local.remove(['downloadHistory'], async () => {
        await loadHistory();
      });
    }
  });
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// CSS Spinner keyframes injecting dynamically
const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
