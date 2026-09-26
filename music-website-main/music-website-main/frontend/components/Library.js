import { icons, getPlaceholderImage, formatDuration } from '../utils/helpers.js';
import { staggerCards, staggerTracks, fadeIn } from '../utils/animations.js';
import * as storage from '../services/storage.js';
import player from '../services/playerEngine.js';

/**
 * Library Component
 * Tabs: Playlists, Liked Songs, Recently Played
 */
export function renderLibrary(container, { onPlaylistSelect, onContextMenu }) {
  let activeTab = 'playlists';

  function render() {
    container.innerHTML = `
      <div class="library-view">
        <h1 class="section-title" style="font-size:28px;margin-bottom:20px;">Your Library</h1>
        <div class="library-tabs">
          <button class="library-tab ${activeTab === 'playlists' ? 'active' : ''}" data-tab="playlists">Playlists</button>
          <button class="library-tab ${activeTab === 'liked' ? 'active' : ''}" data-tab="liked">Liked Songs</button>
          <button class="library-tab ${activeTab === 'recent' ? 'active' : ''}" data-tab="recent">Recently Played</button>
        </div>
        <div id="library-content"></div>
      </div>
    `;

    // Tab clicks
    container.querySelectorAll('.library-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        render();
      });
    });

    const content = container.querySelector('#library-content');

    switch (activeTab) {
      case 'playlists':
        _renderPlaylists(content, onPlaylistSelect);
        break;
      case 'liked':
        _renderLiked(content, onContextMenu);
        break;
      case 'recent':
        _renderRecent(content, onContextMenu);
        break;
    }
  }

  render();
}

function _renderPlaylists(container, onPlaylistSelect) {
  const playlists = storage.getPlaylists();

  if (playlists.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📂</div>
        <h3>No playlists yet</h3>
        <p>Create your first playlist from the sidebar</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="playlist-grid">
      ${playlists
        .map(
          (pl) => `
        <div class="playlist-card" data-playlist-id="${pl.id}">
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
    card.addEventListener('click', () => {
      onPlaylistSelect(card.dataset.playlistId);
    });
  });

  staggerCards('.playlist-card');
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
