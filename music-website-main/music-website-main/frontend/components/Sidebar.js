import { icons } from '../utils/helpers.js';
import * as storage from '../services/storage.js';
import { slideInLeft } from '../utils/animations.js';

/**
 * Sidebar Component
 * Navigation, playlists, create playlist
 */
export function renderSidebar(container, { onNavigate, onPlaylistSelect, onCreatePlaylist, activeView, theme }) {
  const playlists = storage.getPlaylists();
  const appName = theme === 'dreadflow' ? 'DreadFlow' : 'MelodyFlow';
  const logoEmoji = theme === 'dreadflow' ? '💀' : '🎵';

  container.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">${logoEmoji}</div>
      <span class="sidebar-logo-text">${appName}</span>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-item ${activeView === 'home' ? 'active' : ''}" data-view="home">
        ${icons.home} <span>Home</span>
      </div>
      <div class="nav-item ${activeView === 'search' ? 'active' : ''}" data-view="search">
        ${icons.search} <span>Search</span>
      </div>
      <div class="nav-item ${activeView === 'library' ? 'active' : ''}" data-view="library">
        ${icons.library} <span>Your Library</span>
      </div>
    </nav>

    <div class="sidebar-section-title">Playlists</div>
    <div class="sidebar-playlists">
      ${playlists
        .map(
          (pl) => `
        <div class="playlist-item" data-playlist-id="${pl.id}" title="${pl.name}">
          <span class="playlist-item-icon">${icons.music}</span>
          <span>${pl.name}</span>
        </div>
      `
        )
        .join('')}
    </div>

    <button class="create-playlist-btn" id="create-playlist-btn">
      ${icons.plus} <span>Create Playlist</span>
    </button>
  `;

  // Event listeners
  container.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      onNavigate(view);
    });
  });

  container.querySelectorAll('.playlist-item').forEach((item) => {
    item.addEventListener('click', () => {
      onPlaylistSelect(item.dataset.playlistId);
    });
  });

  const createBtn = container.querySelector('#create-playlist-btn');
  if (createBtn) {
    createBtn.addEventListener('click', onCreatePlaylist);
  }

  // Animate
  slideInLeft(container);
}
