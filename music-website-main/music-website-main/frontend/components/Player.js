import { icons, formatDuration, getPlaceholderImage } from '../utils/helpers.js';
import { slideInBottom, buttonPress } from '../utils/animations.js';
import player from '../services/playerEngine.js';
import * as storage from '../services/storage.js';

/**
 * Player Bar Component
 * Bottom bar with song info, playback controls, volume, progress, queue toggle
 */
export function renderPlayer(container, { onQueueToggle, onSongClick }) {
  container.innerHTML = `
    <div class="player-song-info" id="player-song-info">
      <img class="player-album-art" id="player-album-art" src="${getPlaceholderImage()}" alt="" />
      <div class="player-song-details">
        <div class="player-song-title" id="player-song-title">No song playing</div>
        <div class="player-song-artist" id="player-song-artist">—</div>
      </div>
      <div class="player-song-actions">
        <button class="player-action-btn" id="player-like-btn" title="Like">${icons.heart}</button>
      </div>
    </div>

    <div class="player-controls">
      <div class="player-buttons">
        <button class="player-btn" id="shuffle-btn" title="Shuffle">${icons.shuffle}</button>
        <button class="player-btn" id="prev-btn" title="Previous">${icons.skipBack}</button>
        <button class="player-btn play-btn" id="play-btn" title="Play">${icons.play}</button>
        <button class="player-btn" id="next-btn" title="Next">${icons.skipForward}</button>
        <button class="player-btn" id="repeat-btn" title="Repeat">${icons.repeat}</button>
      </div>
      <div class="player-progress">
        <span class="player-time" id="current-time">0:00</span>
        <div class="progress-bar-container" id="progress-bar-container">
          <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
        </div>
        <span class="player-time" id="total-time">0:00</span>
      </div>
    </div>

    <div class="player-extra">
      <div class="volume-control">
        <button class="volume-btn" id="volume-btn">${icons.volumeHigh}</button>
        <div class="volume-slider" id="volume-slider">
          <div class="volume-fill" id="volume-fill" style="width: ${player.getVolume() * 100}%"></div>
        </div>
      </div>
      <button class="queue-toggle-btn" id="queue-toggle-btn" title="Queue">${icons.queue}</button>
    </div>
  `;

  // ─── Elements ──────────────────────────────────────────────
  const playBtn = container.querySelector('#play-btn');
  const nextBtn = container.querySelector('#next-btn');
  const prevBtn = container.querySelector('#prev-btn');
  const shuffleBtn = container.querySelector('#shuffle-btn');
  const repeatBtn = container.querySelector('#repeat-btn');
  const likeBtn = container.querySelector('#player-like-btn');
  const progressContainer = container.querySelector('#progress-bar-container');
  const progressBar = container.querySelector('#progress-bar');
  const currentTimeEl = container.querySelector('#current-time');
  const totalTimeEl = container.querySelector('#total-time');
  const volumeSlider = container.querySelector('#volume-slider');
  const volumeFill = container.querySelector('#volume-fill');
  const volumeBtn = container.querySelector('#volume-btn');
  const albumArt = container.querySelector('#player-album-art');
  const songTitle = container.querySelector('#player-song-title');
  const songArtist = container.querySelector('#player-song-artist');
  const queueToggle = container.querySelector('#queue-toggle-btn');

  // ─── Controls ──────────────────────────────────────────────
  playBtn.addEventListener('click', () => {
    buttonPress(playBtn);
    player.togglePlay();
  });
  nextBtn.addEventListener('click', () => { buttonPress(nextBtn); player.next(); });
  prevBtn.addEventListener('click', () => { buttonPress(prevBtn); player.prev(); });
  shuffleBtn.addEventListener('click', () => { player.toggleShuffle(); });
  repeatBtn.addEventListener('click', () => { player.toggleRepeat(); });

  // Progress bar seek
  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    player.seek(pct);
  });

  // Volume
  volumeSlider.addEventListener('click', (e) => {
    const rect = volumeSlider.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    player.setVolume(pct);
    volumeFill.style.width = `${pct * 100}%`;
  });

  let muted = false;
  let prevVolume = player.getVolume();
  volumeBtn.addEventListener('click', () => {
    if (muted) {
      player.setVolume(prevVolume);
      volumeFill.style.width = `${prevVolume * 100}%`;
      volumeBtn.innerHTML = icons.volumeHigh;
    } else {
      prevVolume = player.getVolume();
      player.setVolume(0);
      volumeFill.style.width = '0%';
      volumeBtn.innerHTML = icons.volumeMute;
    }
    muted = !muted;
  });

  // Like button
  likeBtn.addEventListener('click', () => {
    const song = player.getCurrentSong();
    if (!song) return;
    const liked = storage.toggleLike(song);
    likeBtn.innerHTML = liked ? icons.heartFilled : icons.heart;
    likeBtn.classList.toggle('liked', liked);
    buttonPress(likeBtn);
  });

  // Queue toggle
  queueToggle.addEventListener('click', () => {
    queueToggle.classList.toggle('active');
    onQueueToggle();
  });

  // Song title click
  songTitle.addEventListener('click', () => {
    const song = player.getCurrentSong();
    if (song && onSongClick) onSongClick(song);
  });

  // ─── Player Events ────────────────────────────────────────

  player.on('timeupdate', ({ currentTime, duration }) => {
    const pct = duration ? (currentTime / duration) * 100 : 0;
    progressBar.style.width = `${pct}%`;
    currentTimeEl.textContent = formatDuration(currentTime);
    totalTimeEl.textContent = formatDuration(duration);
  });

  player.on('songchange', ({ song }) => {
    if (song) {
      albumArt.src = song.image || getPlaceholderImage();
      albumArt.onerror = () => { albumArt.src = getPlaceholderImage(); };
      songTitle.textContent = song.title || 'Unknown';
      songArtist.textContent =
        (song.artists?.primary || song.artists?.singers || '') || 'Unknown';
      const isLiked = storage.isLiked(song.id);
      likeBtn.innerHTML = isLiked ? icons.heartFilled : icons.heart;
      likeBtn.classList.toggle('liked', isLiked);
    }
  });

  player.on('statechange', ({ isPlaying }) => {
    playBtn.innerHTML = isPlaying ? icons.pause : icons.play;
  });

  player.on('shufflechange', ({ shuffle }) => {
    shuffleBtn.classList.toggle('active', shuffle);
  });

  player.on('repeatchange', ({ repeat }) => {
    repeatBtn.classList.toggle('active', repeat !== 'off');
    if (repeat === 'one') {
      repeatBtn.style.position = 'relative';
      repeatBtn.innerHTML = icons.repeat + '<span style="position:absolute;font-size:8px;font-weight:700;bottom:2px;right:2px;">1</span>';
    } else {
      repeatBtn.innerHTML = icons.repeat;
    }
  });

  // Restore current state if song is already loaded
  const currentSong = player.getCurrentSong();
  if (currentSong) {
    albumArt.src = currentSong.image || getPlaceholderImage();
    songTitle.textContent = currentSong.title || 'Unknown';
    songArtist.textContent =
      (currentSong.artists?.primary || currentSong.artists?.singers || '') || 'Unknown';
    const isLiked = storage.isLiked(currentSong.id);
    likeBtn.innerHTML = isLiked ? icons.heartFilled : icons.heart;
    likeBtn.classList.toggle('liked', isLiked);
  }
  if (player.isPlaying) {
    playBtn.innerHTML = icons.pause;
  }

  slideInBottom(container);
}
