import { icons, getPlaceholderImage } from '../utils/helpers.js';
import { albumArtEntrance, fadeIn, buttonPress } from '../utils/animations.js';
import player from '../services/playerEngine.js';
import * as storage from '../services/storage.js';

/**
 * Now Playing Detail Panel
 * Shows large album art, song info, like button, and about the artist section
 * (like Spotify's right-side panel)
 */
export function renderNowPlayingDetail(container, { onClose }) {
  _render(container, onClose);

  // Listen for song changes
  player.on('songchange', () => _render(container, onClose));
}

function _render(container, onClose) {
  const song = player.getCurrentSong();

  if (!song) {
    container.innerHTML = `
      <div class="np-header">
        <span class="np-header-title">Now Playing</span>
        <button class="np-close-btn" id="np-close">${icons.x}</button>
      </div>
      <div class="empty-state" style="padding:40px 0;">
        <div class="empty-state-icon">🎵</div>
        <h3>No song playing</h3>
        <p>Search and play a song to see it here</p>
      </div>
    `;
    container.querySelector('#np-close')?.addEventListener('click', onClose);
    return;
  }

  const isLiked = storage.isLiked(song.id);
  const artistName = song.artists?.primary || song.artists?.singers || 'Unknown Artist';
  const albumName = song.album || '';

  container.innerHTML = `
    <div class="np-header">
      <span class="np-header-title">${song.album || 'Now Playing'}</span>
      <button class="np-close-btn" id="np-close">${icons.x}</button>
    </div>

    <img 
      class="np-album-art" 
      id="np-art"
      src="${song.image || getPlaceholderImage()}" 
      alt="${song.title}"
      onerror="this.src='${getPlaceholderImage()}'"
    />

    <div class="np-song-info">
      <div class="np-song-text">
        <div class="np-song-title">${song.title}</div>
        <div class="np-song-artist">${artistName}</div>
      </div>
      <button class="np-like-btn ${isLiked ? 'liked' : ''}" id="np-like">
        ${isLiked ? icons.heartFilled : icons.heart}
      </button>
    </div>

    <div class="np-about">
      <div class="np-about-title">About the artist</div>
      <div class="np-about-artist-row">
        <img class="np-about-artist-avatar" src="${song.image || getPlaceholderImage()}" alt="${artistName}" onerror="this.src='${getPlaceholderImage()}'" />
        <div>
          <div class="np-about-artist-name">${artistName}</div>
          <div class="np-about-artist-meta">${albumName ? 'Album: ' + albumName : 'Artist'}</div>
        </div>
      </div>
      <div class="np-about-text">
        Listen to ${artistName}'s top tracks and discover their music. Explore albums, playlists, and more.
      </div>
    </div>
  `;

  // Close button
  container.querySelector('#np-close')?.addEventListener('click', onClose);

  // Like button
  container.querySelector('#np-like')?.addEventListener('click', (e) => {
    const liked = storage.toggleLike(song);
    const btn = container.querySelector('#np-like');
    btn.innerHTML = liked ? icons.heartFilled : icons.heart;
    btn.classList.toggle('liked', liked);
    buttonPress(btn);
  });

  // Animate album art
  const art = container.querySelector('#np-art');
  if (art) albumArtEntrance(art);
}
