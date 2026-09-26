import { icons, getPlaceholderImage, formatDuration } from '../utils/helpers.js';
import { showToast } from '../utils/animations.js';
import * as api from '../services/api.js';
import * as storage from '../services/storage.js';
import gsap from 'gsap';



export function renderImportModal(container, { onComplete, onClose }) {
  container.innerHTML = `
    <div class="import-backdrop" id="import-backdrop">
      <div class="import-card" id="import-card">
        <div class="import-header">
          <h2 class="import-title">Import Playlist</h2>
          <button class="import-close-btn" id="import-close-btn">${icons.x}</button>
        </div>

        <div class="import-tabs">
          <button class="import-tab active" data-source="spotify">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <span>Spotify</span>
          </button>
          <button class="import-tab" data-source="ytmusic">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228 18.228 15.432 18.228 12 15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
            </svg>
            <span>YouTube Music</span>
          </button>
          <button class="import-tab" data-source="database">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Database</span>
          </button>
        </div>

        <div class="import-body">
          <div class="import-input-section" id="import-input-section">
            <p class="import-instruction" id="import-instruction">Paste your Spotify playlist URL below</p>
            <div class="auth-input-wrapper">
              <input type="url" id="import-url-input" class="auth-input" placeholder="https://open.spotify.com/playlist/..." />
              <input type="file" id="import-file-input" class="auth-input hidden" accept=".db,.sqlite,.sql,application/x-sqlite3" style="padding-top: 10px; cursor: pointer;" />
            </div>
            <button class="auth-btn auth-btn-primary" id="import-start-btn">
              <span class="auth-btn-text">Import Playlist</span>
              <span class="auth-btn-loader hidden" id="import-loader">
                <span class="auth-spinner"></span>
              </span>
            </button>
            <div class="auth-error hidden" id="import-error"></div>
          </div>

          <div class="import-progress hidden" id="import-progress">
            <div class="import-progress-bar-container">
              <div class="import-progress-bar" id="import-progress-bar"></div>
            </div>
            <p class="import-progress-text" id="import-progress-text">Importing...</p>
          </div>

          <div class="import-results hidden" id="import-results">
            <div class="import-results-summary" id="import-results-summary"></div>
            <div class="import-results-list" id="import-results-list"></div>
            <button class="auth-btn auth-btn-primary" id="import-save-btn">Save as Playlist</button>
          </div>
        </div>
      </div>
    </div>
  `;

  let currentSource = 'spotify';
  let importedSongs = [];
  const backdrop = container.querySelector('#import-backdrop');
  const card = container.querySelector('#import-card');
  gsap.set(backdrop, { opacity: 0 });
  gsap.set(card, { y: 30, scale: 0.95, opacity: 0 });
  gsap.to(backdrop, { opacity: 1, duration: 0.3 });
  gsap.to(card, { y: 0, scale: 1, opacity: 1, duration: 0.4, delay: 0.1, ease: 'back.out(1.3)' });
  const closeBtn = container.querySelector('#import-close-btn');
  closeBtn.addEventListener('click', () => _closeImportModal(container, onClose));
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) _closeImportModal(container, onClose);
  });
  container.querySelectorAll('.import-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.import-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentSource = tab.dataset.source;
      const instruction = container.querySelector('#import-instruction');
      const urlInput = container.querySelector('#import-url-input');
      const fileInput = container.querySelector('#import-file-input');
      
      if (currentSource === 'spotify') {
        instruction.textContent = 'Paste your Spotify playlist URL below';
        urlInput.placeholder = 'https://open.spotify.com/playlist/...';
        urlInput.classList.remove('hidden');
        fileInput.classList.add('hidden');
      } else if (currentSource === 'ytmusic') {
        instruction.textContent = 'Paste your YouTube Music playlist URL below';
        urlInput.placeholder = 'https://music.youtube.com/playlist?list=...';
        urlInput.classList.remove('hidden');
        fileInput.classList.add('hidden');
      } else {
        instruction.textContent = 'Upload your SQLite Database file (.db)';
        urlInput.classList.add('hidden');
        fileInput.classList.remove('hidden');
      }
      container.querySelector('#import-input-section').classList.remove('hidden');
      container.querySelector('#import-progress').classList.add('hidden');
      container.querySelector('#import-results').classList.add('hidden');
    });
  });
  const startBtn = container.querySelector('#import-start-btn');
  const loader = container.querySelector('#import-loader');
  const btnText = startBtn.querySelector('.auth-btn-text');
  const errorEl = container.querySelector('#import-error');

  startBtn.addEventListener('click', async () => {
    let payload = null;
    let isFormData = false;

    if (currentSource === 'database') {
      const fileInput = container.querySelector('#import-file-input');
      if (!fileInput.files || fileInput.files.length === 0) {
        _showImportError(errorEl, 'Please select a database file');
        return;
      }
      payload = new FormData();
      payload.append('dbFile', fileInput.files[0]);
      isFormData = true;
    } else {
      const url = container.querySelector('#import-url-input').value.trim();
      if (!url) {
        _showImportError(errorEl, 'Please enter a playlist URL');
        return;
      }
      payload = JSON.stringify({ url });
    }

    startBtn.disabled = true;
    btnText.classList.add('hidden');
    loader.classList.remove('hidden');
    errorEl.classList.add('hidden');
    container.querySelector('#import-input-section').classList.add('hidden');
    const progressSection = container.querySelector('#import-progress');
    progressSection.classList.remove('hidden');
    const progressBar = container.querySelector('#import-progress-bar');
    const progressText = container.querySelector('#import-progress-text');

    gsap.to(progressBar, { width: '30%', duration: 1, ease: 'power1.out' });
    progressText.textContent = `Fetching playlist from ${currentSource === 'spotify' ? 'Spotify' : 'YouTube Music'}...`;

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || '/api';
      let endpoint = `${BASE_URL}/import/${currentSource}`;
      
      const fetchOptions = {
        method: 'POST',
        body: payload
      };
      
      if (!isFormData) {
        fetchOptions.headers = { 'Content-Type': 'application/json' };
      }

      const response = await fetch(endpoint, fetchOptions);

      gsap.to(progressBar, { width: '70%', duration: 0.5 });
      progressText.textContent = 'Matching songs to library...';

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Import failed' }));
        throw new Error(err.error || 'Import failed');
      }

      const data = await response.json();
      importedSongs = data.songs || [];

      gsap.to(progressBar, { width: '100%', duration: 0.3 });
      progressText.textContent = 'Done!';

      setTimeout(() => {
        progressSection.classList.add('hidden');
        _showResults(container, importedSongs, data.playlistName || 'Imported Playlist', data.totalTracks || 0);
      }, 500);

    } catch (err) {
      progressSection.classList.add('hidden');
      container.querySelector('#import-input-section').classList.remove('hidden');
      startBtn.disabled = false;
      btnText.classList.remove('hidden');
      loader.classList.add('hidden');
      _showImportError(errorEl, err.message);
    }
  });
  container.querySelector('#import-save-btn')?.addEventListener('click', () => {
    if (importedSongs.length === 0) return;
    const playlistName = container.querySelector('#import-playlist-name')?.value || 'Imported Playlist';
    const pl = storage.createPlaylist(playlistName);
    importedSongs.forEach(song => storage.addSongToPlaylist(pl.id, song));

    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) showToast(toastContainer, `Created "${playlistName}" with ${importedSongs.length} songs`);

    _closeImportModal(container, onClose);
    if (onComplete) onComplete();
  });
}

function _showResults(container, songs, playlistName, totalTracks) {
  const resultsSection = container.querySelector('#import-results');
  const summaryEl = container.querySelector('#import-results-summary');
  const listEl = container.querySelector('#import-results-list');

  resultsSection.classList.remove('hidden');

  const matched = songs.length;
  const unmatched = totalTracks - matched;

  summaryEl.innerHTML = `
    <div class="import-summary-stat import-summary-matched">
      <span class="import-summary-number">${matched}</span>
      <span class="import-summary-label">Songs matched</span>
    </div>
    ${unmatched > 0 ? `
    <div class="import-summary-stat import-summary-unmatched">
      <span class="import-summary-number">${unmatched}</span>
      <span class="import-summary-label">Not found</span>
    </div>` : ''}
    <div class="auth-input-group" style="margin-top:12px;">
      <input type="text" id="import-playlist-name" class="auth-input" value="${playlistName}" placeholder="Playlist name" />
    </div>
  `;

  listEl.innerHTML = songs.slice(0, 20).map((song, i) => `
    <div class="import-result-track">
      <img src="${song.image || getPlaceholderImage()}" alt="" class="import-result-img" />
      <div class="import-result-info">
        <div class="import-result-title">${song.title}</div>
        <div class="import-result-artist">${song.artists?.primary || song.artists?.singers || 'Unknown'}</div>
      </div>
    </div>
  `).join('') + (songs.length > 20 ? `<p class="import-more">+${songs.length - 20} more songs</p>` : '');

  gsap.from(resultsSection, { y: 20, opacity: 0, duration: 0.3, ease: 'power2.out' });
}

function _showImportError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  gsap.from(el, { y: -10, opacity: 0, duration: 0.25 });
}

function _closeImportModal(container, onClose) {
  const backdrop = container.querySelector('#import-backdrop');
  if (!backdrop) return;
  gsap.to(backdrop, {
    opacity: 0, duration: 0.3, ease: 'power2.in',
    onComplete: () => {
      container.innerHTML = '';
      if (onClose) onClose();
    }
  });
}

export function hideImportModal(container) {
  _closeImportModal(container, null);
}
