import { icons, getPlaceholderImage, formatDuration } from '../utils/helpers.js';
import { staggerTracks, albumArtEntrance, fadeIn } from '../utils/animations.js';
import * as storage from '../services/storage.js';
import player from '../services/playerEngine.js';

/**
 * Playlist View Component
 * Shows a single playlist with header, actions, and track list
 */
export function renderPlaylistView(container, { playlistId, onContextMenu, onBack }) {
  const playlist = storage.getPlaylistById(playlistId);

  if (!playlist) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🚫</div>
        <h3>Playlist not found</h3>
      </div>
    `;
    return;
  }

  const coverImage = playlist.songs.length > 0 ? playlist.songs[0].image : null;
  const totalDuration = playlist.songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  container.innerHTML = `
    <div class="playlist-view">
      <div class="playlist-header">
        <div class="playlist-cover" id="playlist-cover-art">
          ${
            coverImage
              ? `<img src="${coverImage}" alt="${playlist.name}" onerror="this.parentElement.textContent='🎵'" />`
              : '🎵'
          }
        </div>
        <div class="playlist-meta">
          <div class="playlist-type">Playlist</div>
          <h1 class="playlist-name">${playlist.name}</h1>
          <div class="playlist-stats">${playlist.songs.length} song${playlist.songs.length !== 1 ? 's' : ''} · ${formatDuration(totalDuration)}</div>
        </div>
      </div>

      <div class="playlist-actions">
        <button class="playlist-play-btn" id="playlist-play-all" ${playlist.songs.length === 0 ? 'disabled' : ''}>${icons.play}</button>
        <button class="playlist-action-btn" id="playlist-add-songs-btn" title="Add songs">${icons.plus} Explore & Add</button>
        <button class="playlist-action-btn" id="playlist-delete-btn" title="Delete playlist">${icons.trash}</button>
      </div>

      <div id="playlist-tracks">
        ${
          playlist.songs.length > 0
            ? playlist.songs
                .map(
                  (song, i) => `
            <div class="track-row" data-song='${JSON.stringify(song).replace(/'/g, '&#39;')}' data-index="${i}">
              <span class="track-row-number">${i + 1}</span>
              <img class="track-row-img" src="${song.image || getPlaceholderImage()}" alt="" onerror="this.src='${getPlaceholderImage()}'" />
              <div class="track-row-info">
                <div class="track-row-title">${song.title}</div>
                <div class="track-row-artist">${song.artists?.primary || song.artists?.singers || ''}</div>
              </div>
              <span class="track-row-album">${song.album || ''}</span>
              <span class="track-row-duration">${formatDuration(song.duration)}</span>
              <div class="track-row-actions">
                <button class="track-remove-btn" data-song-id="${song.id}" title="Remove">${icons.x}</button>
              </div>
            </div>
          `
                )
                .join('')
            : '<div class="empty-state"><div class="empty-state-icon">📂</div><h3>Empty playlist</h3><p>Search and add songs to get started</p></div>'
        }
      </div>
    </div>
  `;

  // Play all
  container.querySelector('#playlist-play-all')?.addEventListener('click', () => {
    if (playlist.songs.length > 0) {
      player.playSongList(playlist.songs, 0);
    }
  });

  // Delete playlist
  container.querySelector('#playlist-delete-btn')?.addEventListener('click', () => {
    if (confirm(`Delete "${playlist.name}"?`)) {
      storage.deletePlaylist(playlistId);
      onBack();
    }
  });

  // Add songs
  container.querySelector('#playlist-add-songs-btn')?.addEventListener('click', () => {
    if (onBack) {
      // For now, we use the easiest way to go to search which is basically
      // just clicking the search input or navigating to it via main.js
      document.getElementById('search-input')?.focus();
    }
  });

  // Play individual tracks
  container.querySelectorAll('.track-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.track-remove-btn')) return;
      const idx = parseInt(row.dataset.index);
      player.playSongList(playlist.songs, idx);
    });
  });

  // Remove from playlist
  container.querySelectorAll('.track-remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const songId = btn.dataset.songId;
      storage.removeSongFromPlaylist(playlistId, songId);
      renderPlaylistView(container, { playlistId, onContextMenu, onBack });
    });
  });

  // Animate
  const cover = container.querySelector('#playlist-cover-art');
  if (cover) albumArtEntrance(cover);
  staggerTracks('.track-row');
}
