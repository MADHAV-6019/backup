import { icons, getPlaceholderImage, formatDuration } from '../utils/helpers.js';
import { staggerCards, staggerTracks, fadeIn, showToast } from '../utils/animations.js';
import * as storage from '../services/storage.js';
import player from '../services/playerEngine.js';


export function renderLibrary(container, { onPlaylistSelect, onContextMenu, onImportPlaylist, onCreatePlaylist }) {
  let activeTab = 'playlists';

  function render() {
    container.innerHTML = `
      <div class="library-view">
        <h1 class="section-title" style="font-size:28px;margin-bottom:20px;">Your Library</h1>
        <div class="library-tabs">
          <button class="library-tab ${activeTab === 'playlists' ? 'active' : ''}" data-tab="playlists">Playlists</button>
          <button class="library-tab ${activeTab === 'liked' ? 'active' : ''}" data-tab="liked">Liked Songs</button>
          <button class="library-tab ${activeTab === 'recent' ? 'active' : ''}" data-tab="recent">Recently Played</button>
          <button class="library-tab ${activeTab === 'local' ? 'active' : ''}" data-tab="local">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:4px;vertical-align:-2px;">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            Local Files
          </button>
        </div>
        <div id="library-content"></div>
      </div>
    `;
    container.querySelectorAll('.library-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        render();
      });
    });

    const content = container.querySelector('#library-content');

    switch (activeTab) {
      case 'playlists':
        _renderPlaylists(content, onPlaylistSelect, onImportPlaylist, onCreatePlaylist);
        break;
      case 'liked':
        _renderLiked(content, onContextMenu);
        break;
      case 'recent':
        _renderRecent(content, onContextMenu);
        break;
      case 'local':
        _renderLocalFiles(content);
        break;
    }
  }

  render();
}

function _renderPlaylists(container, onPlaylistSelect, onImportPlaylist, onCreatePlaylist) {
  const playlists = storage.getPlaylists();

  const headerHTML = `
    <div class="library-actions-bar" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="library-action-btn" id="library-create-playlist-btn">
        ${icons.plus} Create Playlist
      </button>
      <button class="library-action-btn" id="import-playlist-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Import Platform
      </button>
    </div>
  `;

  if (playlists.length === 0) {
    container.innerHTML = `
      ${headerHTML}
      <div class="empty-state">
        <div class="empty-state-icon">📂</div>
        <h3>No playlists yet</h3>
        <p>Create your first playlist to get started</p>
      </div>
    `;
    _bindImportButton(container, onImportPlaylist);
    _bindCreateButton(container, onCreatePlaylist);
    return;
  }

  container.innerHTML = `
    ${headerHTML}
    <div class="playlist-grid">
      ${playlists
        .map(
          (pl) => `
        <div class="playlist-card" data-playlist-id="${pl.id}">
          <button class="playlist-card-delete" data-playlist-id="${pl.id}" title="Delete playlist">
            ${icons.trash}
          </button>
          <div class="playlist-card-cover">
            ${
              pl.songs.length > 0
                ? `<img src="${pl.songs[0].image || getPlaceholderImage()}" alt="" onerror="this.src='${getPlaceholderImage()}'" />`
                : '🎵'
            }
          </div>
          <div class="playlist-card-name">${pl.name}</div>
          <div class="playlist-card-count">${pl.songs.length} song${pl.songs.length !== 1 ? 's' : ''}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `;

  container.querySelectorAll('.playlist-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.playlist-card-delete')) return;
      onPlaylistSelect(card.dataset.playlistId);
    });
  });

  container.querySelectorAll('.playlist-card-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.playlistId;
      const pl = playlists.find(p => p.id === id);
      if (confirm(`Delete "${pl.name}"?`)) {
        storage.deletePlaylist(id);
        const parent = container.closest('#library-content') || container;
        _renderPlaylists(parent, onPlaylistSelect, onImportPlaylist);
        
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) showToast(toastContainer, 'Playlist deleted');
      }
    });
  });

  _bindImportButton(container, onImportPlaylist);
  _bindCreateButton(container, onCreatePlaylist);
  staggerCards('.playlist-card');
}

function _bindImportButton(container, onImportPlaylist) {
  const importBtn = container.querySelector('#import-playlist-btn');
  if (importBtn && onImportPlaylist) {
    importBtn.addEventListener('click', () => onImportPlaylist());
  }
}

function _bindCreateButton(container, onCreatePlaylist) {
  const btn = container.querySelector('#library-create-playlist-btn');
  if (btn && onCreatePlaylist) {
    btn.addEventListener('click', () => onCreatePlaylist());
  }
}

function _renderSongList(container, songs, title, emptyIcon, emptyMsg, onContextMenu) {
  if (songs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${emptyIcon}</div>
        <h3>${title}</h3>
        <p>${emptyMsg}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = songs
    .map(
      (song, i) => `
    <div class="track-row" data-song='${JSON.stringify(song).replace(/'/g, '&#39;')}'>
      <span class="track-row-number">${i + 1}</span>
      <img class="track-row-img" src="${song.image || getPlaceholderImage()}" alt="" onerror="this.src='${getPlaceholderImage()}'" />
      <div class="track-row-info">
        <div class="track-row-title">${song.title}</div>
        <div class="track-row-artist">${song.artists?.primary || song.artists?.singers || ''}</div>
      </div>
      <span class="track-row-album">${song.album || ''}</span>
      <span class="track-row-duration">${formatDuration(song.duration)}</span>
      <div class="track-row-actions">
        <button class="track-more-btn" data-song='${JSON.stringify(song).replace(/'/g, '&#39;')}'>${icons.moreVertical}</button>
      </div>
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.track-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.track-more-btn')) return;
      const song = JSON.parse(row.dataset.song);
      player.playSongList(songs, songs.findIndex((s) => s.id === song.id));
    });
  });

  container.querySelectorAll('.track-more-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const song = JSON.parse(btn.dataset.song);
      onContextMenu(e, song);
    });
  });

  staggerTracks('.track-row');
}

function _renderLiked(container, onContextMenu) {
  const liked = storage.getLikedSongs();
  _renderSongList(container, liked, 'No liked songs', '❤️', 'Like songs to see them here', onContextMenu);
}

function _renderRecent(container, onContextMenu) {
  const recent = storage.getRecentlyPlayed();
  _renderSongList(container, recent, 'No recent plays', '🕐', 'Play songs to build your history', onContextMenu);
}

function _renderLocalFiles(container) {
  container.innerHTML = `
    <div class="local-files-section">
      <div class="local-files-header">
        <p class="local-files-desc">Play audio files directly from your device. Supported formats: MP3, FLAC, WAV, AAC, OGG, M4A</p>
        <div class="local-files-actions">
          <button class="auth-btn auth-btn-primary local-files-btn" id="local-add-files-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Choose Files</span>
          </button>
          <input type="file" id="local-file-input" accept="audio/*" multiple style="display:none;" />
        </div>
      </div>
      <div id="local-files-list" class="local-files-list"></div>
    </div>
  `;

  const fileInput = container.querySelector('#local-file-input');
  const addBtn = container.querySelector('#local-add-files-btn');
  const listEl = container.querySelector('#local-files-list');

  addBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const songs = files.map(file => ({
      id: `local_${file.name}_${file.size}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artists: { primary: 'Local File' },
      image: null,
      duration: 0,
      album: 'Local Files',
      isLocal: true,
      file: file,
      localUrl: URL.createObjectURL(file),
    }));
    _renderLocalFilesList(listEl, songs);
    player.playLocalFiles(files);

    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) showToast(toastContainer, `Added ${files.length} local file${files.length > 1 ? 's' : ''}`);
  });
}

function _renderLocalFilesList(container, songs) {
  if (songs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎵</div>
        <h3>No files selected</h3>
        <p>Choose audio files from your device to play them</p>
      </div>
    `;
    return;
  }

  container.innerHTML = songs.map((song, i) => `
    <div class="track-row local-file-row" data-index="${i}">
      <span class="track-row-number">${i + 1}</span>
      <div class="track-row-local-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="36" height="36">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
      </div>
      <div class="track-row-info">
        <div class="track-row-title">${song.title} <span class="local-badge">LOCAL</span></div>
        <div class="track-row-artist">Local File</div>
      </div>
      <span class="track-row-duration">—</span>
    </div>
  `).join('');

  container.querySelectorAll('.local-file-row').forEach((row) => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.index);
      if (songs[idx]?.file) {
        player.playLocalFile(songs[idx].file);
      }
    });
  });

  staggerTracks('.local-file-row');
}
