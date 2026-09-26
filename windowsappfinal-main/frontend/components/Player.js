import { icons, formatDuration, getPlaceholderImage } from '../utils/helpers.js';
import player from '../services/playerEngine.js';
import * as storage from '../services/storage.js';

let progressInterval;

export function renderPlayer() {
  const container = document.getElementById('player-bar');
  if (!container) return;

  const song = player.currentSong || player.getCurrentSong();
  const isPlaying = player.isPlaying;
  const isLiked = song ? storage.isLiked(song.id || song.videoId) : false;

  const art = song?.image || getPlaceholderImage();
  const title = song ? song.title : 'No song playing';
  const artist = song?.artists?.primary || song?.artists?.singers || song?.artist?.name || '—';

  container.innerHTML = `
    <!-- Left: Track Info -->
    <div class="player-song-info">
      <img src="${art}" class="player-song-img" id="player-art" alt="Cover" onerror="this.src='${getPlaceholderImage()}'" />
      <div class="player-song-text">
        <div class="player-song-title" id="player-title">${title}</div>
        <div class="player-song-artist" id="player-artist">${artist}</div>
      </div>
    </div>

    <!-- Center: Controls + Seek -->
    <div class="player-center">
      <div class="player-controls">
        <button class="control-btn" id="btn-shuffle" style="opacity:${player.shuffle ? 1 : 0.4}">${icons.shuffle}</button>
        <button class="control-btn" id="btn-prev">${icons.skipBack}</button>
        <button class="play-btn" id="btn-play">${isPlaying ? icons.pause : icons.play}</button>
        <button class="control-btn" id="btn-next">${icons.skipForward}</button>
        <button class="control-btn" id="btn-repeat" style="opacity:${player.repeat !== 'off' ? 1 : 0.4}">${player.repeat === 'one' ? icons.repeat1 : icons.repeat}</button>
      </div>
      <div class="player-progress">
        <span class="progress-time" id="time-current">0:00</span>
        <div class="progress-bar-container" id="progress-container">
          <div class="progress-bar" id="progress-bar"></div>
        </div>
        <span class="progress-time" id="time-total">0:00</span>
      </div>
    </div>

    <!-- Right: Like, Lyrics, Queue, Volume -->
    <div class="player-right">
      <button class="control-btn ${isLiked ? 'liked' : ''}" id="btn-like" style="color:${isLiked ? '#f87171' : 'var(--text-secondary)'}">${isLiked ? icons.heartFilled : icons.heart}</button>
      <button class="control-btn" id="btn-lyrics" title="Lyrics">${icons.lyrics}</button>
      <button class="control-btn" id="btn-queue" title="Queue">${icons.queue}</button>
      <div style="display:flex; align-items:center; gap:0.4rem; color:var(--text-secondary);">
        <div class="control-btn" style="cursor:default;">${icons.volumeHigh}</div>
        <input type="range" id="volume-slider" class="volume-slider" min="0" max="1" step="0.01" value="${player.getVolume()}" />
      </div>
    </div>
  `;

  _attachEvents(container);
  _startProgressLoop(container);
}

function _attachEvents(container) {
  container.querySelector('#btn-play')?.addEventListener('click', () => player.togglePlay());
  container.querySelector('#btn-next')?.addEventListener('click', () => player.next());
  container.querySelector('#btn-prev')?.addEventListener('click', () => player.prev());
  container.querySelector('#btn-shuffle')?.addEventListener('click', () => {
    player.toggleShuffle();
    renderPlayer();
  });
  container.querySelector('#btn-repeat')?.addEventListener('click', () => {
    player.toggleRepeat();
    renderPlayer();
  });

  container.querySelector('#btn-like')?.addEventListener('click', () => {
    const song = player.currentSong || player.getCurrentSong();
    if (!song) return;
    storage.toggleLike(song);
    renderPlayer();
  });

  const progContainer = container.querySelector('#progress-container');
  progContainer?.addEventListener('click', (e) => {
    if (!player.audio?.duration) return;
    const rect = progContainer.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    player.seek(pct);
  });

  const vol = container.querySelector('#volume-slider');
  vol?.addEventListener('input', (e) => {
    player.setVolume(parseFloat(e.target.value));
  });

  container.querySelector('#btn-lyrics')?.addEventListener('click', () => {
    import('./Lyrics.js').then(({ toggleLyrics }) => toggleLyrics());
  });

  container.querySelector('#btn-queue')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('toggle-queue'));
  });
}

function _startProgressLoop(container) {
  if (progressInterval) clearInterval(progressInterval);
  const bar = container.querySelector('#progress-bar');
  const cur = container.querySelector('#time-current');
  const tot = container.querySelector('#time-total');

  progressInterval = setInterval(() => {
    if (!player.audio) return;
    const currentTime = player.audio.currentTime || 0;
    const duration = player.audio.duration || 0;
    if (duration > 0) {
      if (bar) bar.style.width = `${(currentTime / duration) * 100}%`;
      if (cur) cur.textContent = formatDuration(currentTime);
      if (tot) tot.textContent = formatDuration(duration);
    }
  }, 250);
}

// React to engine events
player.on('songchange', () => renderPlayer());
player.on('statechange', () => renderPlayer());
