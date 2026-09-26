import { getStreamUrl } from './api.js';
import * as storage from './storage.js';
import { getPlaceholderImage } from '../utils/helpers.js';

class PlayerEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.volume = storage.getVolume();

    this.queue = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.shuffle = false;
    this.repeat = 'off'; 
    this.listeners = {};
    this._localObjectUrls = new Map(); 
    this._pipWindow = null; 

    this._setupAudioEvents();
    this._setupMediaSession();
  }

  _setupAudioEvents() {
    this.audio.addEventListener('timeupdate', () => {
      this.emit('timeupdate', {
        currentTime: this.audio.currentTime,
        duration: this.audio.duration || 0,
      });
      this._updatePositionState();
    });

    this.audio.addEventListener('ended', () => {
      this._handleTrackEnd();
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.emit('statechange', { isPlaying: true });
      this._updateMediaSessionPlaybackState('playing');
      this._updatePipPlayBtn();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.emit('statechange', { isPlaying: false });
      this._updateMediaSessionPlaybackState('paused');
      this._updatePipPlayBtn();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.emit('loaded', {
        duration: this.audio.duration,
      });
      this._updatePositionState();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('[PlayerEngine] Audio error:', e);
      this.emit('error', { error: 'Failed to load audio' });
    });
  }

  _setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;

    ms.setActionHandler('play', () => this.togglePlay());
    ms.setActionHandler('pause', () => this.togglePlay());
    ms.setActionHandler('previoustrack', () => this.prev());
    ms.setActionHandler('nexttrack', () => this.next());

    ms.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      this.audio.currentTime = Math.max(this.audio.currentTime - skipTime, 0);
    });

    ms.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      this.audio.currentTime = Math.min(
        this.audio.currentTime + skipTime,
        this.audio.duration || 0
      );
    });

    try {
      ms.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in this.audio) {
          this.audio.fastSeek(details.seekTime);
        } else {
          this.audio.currentTime = details.seekTime;
        }
        this._updatePositionState();
      });
    } catch (e) { }

    try {
      ms.setActionHandler('stop', () => {
        this.audio.pause();
        this.audio.currentTime = 0;
      });
    } catch (e) { }

    try {
      ms.setActionHandler('togglerepeat', () => this.toggleRepeat());
    } catch (e) { }

    try {
      ms.setActionHandler('toggleshuffle', () => this.toggleShuffle());
    } catch (e) { }

    try {
      ms.setActionHandler('enterpictureinpicture', () => this.togglePictureInPicture());
    } catch (e) { }
  }

  _updateMediaSessionMetadata(song) {
    if (!('mediaSession' in navigator) || !song) return;

    const artwork = [];
    if (song.image && !song.isLocal) {
      artwork.push(
        { src: song.image, sizes: '96x96', type: 'image/jpeg' },
        { src: song.image, sizes: '128x128', type: 'image/jpeg' },
        { src: song.image, sizes: '192x192', type: 'image/jpeg' },
        { src: song.image, sizes: '256x256', type: 'image/jpeg' },
        { src: song.image, sizes: '384x384', type: 'image/jpeg' },
        { src: song.image, sizes: '512x512', type: 'image/jpeg' }
      );
    } else {
      const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#1a1a2e"/><text x="256" y="280" text-anchor="middle" font-family="sans-serif" font-size="120" fill="#6c63ff">♪</text></svg>`;
      const blob = new Blob([placeholderSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      artwork.push({ src: url, sizes: '512x512', type: 'image/svg+xml' });
    }

    const artist = song.artists?.primary || song.artists?.singers || 'Unknown Artist';

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown',
      artist: artist,
      album: song.album || '',
      artwork: artwork,
    });

    this._updatePipUI();
  }

  _updateMediaSessionPlaybackState(state) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = state;
  }

  _updatePositionState() {
    if (!('mediaSession' in navigator)) return;
    if (!this.audio.duration || isNaN(this.audio.duration)) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: this.audio.duration,
        playbackRate: this.audio.playbackRate,
        position: Math.min(this.audio.currentTime, this.audio.duration),
      });
    } catch (e) { }
  }

  async togglePictureInPicture() {
    if (this._pipWindow) {
      this._pipWindow.close();
      this._pipWindow = null;
      return;
    }

    if (!('documentPictureInPicture' in window)) {
      console.warn('[PlayerEngine] Document Picture-in-Picture API not supported');
      return;
    }

    try {
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 360,
        height: 200,
      });
      this._pipWindow = pipWindow;

      const styles = [...document.styleSheets];
      styles.forEach((sheet) => {
        try {
          if (sheet.href) {
            const link = pipWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            pipWindow.document.head.appendChild(link);
          } else if (sheet.cssRules) {
            const style = pipWindow.document.createElement('style');
            Array.from(sheet.cssRules).forEach((rule) => {
              style.textContent += rule.cssText + '\n';
            });
            pipWindow.document.head.appendChild(style);
          }
        } catch (e) { }
      });

      const pipStyle = pipWindow.document.createElement('style');
      pipStyle.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Inter', 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%);
          color: #e0e0e0; 
          overflow: hidden;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pip-container { display: flex; align-items: center; gap: 14px; padding: 16px 20px; width: 100%; max-width: 360px; }
        .pip-art { width: 80px; height: 80px; border-radius: 10px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .pip-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
        .pip-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
        .pip-artist { font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pip-controls { display: flex; align-items: center; gap: 6px; }
        .pip-btn { background: none; border: none; color: #ccc; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.15s ease; padding: 0; }
        .pip-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .pip-btn.active { color: #6c63ff; }
        .pip-btn svg { width: 18px; height: 18px; }
        .pip-btn.pip-play-btn { width: 38px; height: 38px; background: #6c63ff; color: #fff; }
        .pip-btn.pip-play-btn:hover { background: #7c73ff; }
        .pip-btn.pip-play-btn svg { width: 20px; height: 20px; }
      `;
      pipWindow.document.head.appendChild(pipStyle);

      const song = this.getCurrentSong();
      const imgSrc = (song && !song.isLocal && song.image) ? song.image : getPlaceholderImage();
      const artist = song?.artists?.primary || song?.artists?.singers || 'Unknown Artist';

      const container = pipWindow.document.createElement('div');
      container.className = 'pip-container';
      container.innerHTML = `
        <img class="pip-art" id="pip-art" src="${imgSrc}" alt="" />
        <div class="pip-info">
          <div class="pip-title" id="pip-title">${song?.title || 'No song playing'}</div>
          <div class="pip-artist" id="pip-artist">${artist}</div>
          <div class="pip-controls">
            <button class="pip-btn" id="pip-repeat" title="Repeat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </button>
            <button class="pip-btn" id="pip-prev" title="Previous">
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <button class="pip-btn pip-play-btn" id="pip-play" title="Play">
              ${this.isPlaying 
                ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
              }
            </button>
            <button class="pip-btn" id="pip-next" title="Next">
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"/></svg>
            </button>
          </div>
        </div>
      `;
      pipWindow.document.body.appendChild(container);

      this._updatePipRepeatBtn();

      pipWindow.document.getElementById('pip-play').addEventListener('click', () => this.togglePlay());
      pipWindow.document.getElementById('pip-prev').addEventListener('click', () => this.prev());
      pipWindow.document.getElementById('pip-next').addEventListener('click', () => this.next());
      pipWindow.document.getElementById('pip-repeat').addEventListener('click', () => this.toggleRepeat());

      pipWindow.addEventListener('pagehide', () => {
        this._pipWindow = null;
      });
    } catch (e) {
      console.error('[PlayerEngine] PiP error:', e);
    }
  }

  _updatePipUI() {
    if (!this._pipWindow) return;
    const song = this.getCurrentSong();
    if (!song) return;
    try {
      const art = this._pipWindow.document.getElementById('pip-art');
      const title = this._pipWindow.document.getElementById('pip-title');
      const artist = this._pipWindow.document.getElementById('pip-artist');
      if (art) art.src = (song.image && !song.isLocal) ? song.image : getPlaceholderImage();
      if (title) title.textContent = song.title || 'Unknown';
      if (artist) artist.textContent = song.artists?.primary || song.artists?.singers || 'Unknown Artist';
    } catch (e) { }
  }

  _updatePipPlayBtn() {
    if (!this._pipWindow) return;
    try {
      const btn = this._pipWindow.document.getElementById('pip-play');
      if (btn) {
        btn.innerHTML = this.isPlaying
          ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      }
    } catch (e) { }
  }

  _updatePipRepeatBtn() {
    if (!this._pipWindow) return;
    try {
      const btn = this._pipWindow.document.getElementById('pip-repeat');
      if (!btn) return;
      btn.classList.toggle('active', this.repeat !== 'off');
      if (this.repeat === 'one') {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="15" font-size="8" font-weight="bold" fill="currentColor" stroke="none" text-anchor="middle">1</text></svg>';
      } else {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
      }
    } catch (e) { }
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((cb) => cb(data));
  }

  getCurrentSong() {
    return this.queue[this.currentIndex] || null;
  }

  playSong(song, clearQueue = false) {
    if (clearQueue) {
      this.queue = [song];
      this.currentIndex = 0;
    } else {
      const existingIndex = this.queue.findIndex((s) => s.id === song.id);
      if (existingIndex >= 0) {
        this.currentIndex = existingIndex;
      } else {
        this.currentIndex = this.queue.length;
        this.queue.push(song);
      }
    }

    this._loadAndPlay();
    storage.addToRecentlyPlayed(song);
    this.emit('songchange', { song, queue: this.queue, index: this.currentIndex });
  }

  playSongList(songs, startIndex = 0) {
    this.queue = [...songs];
    this.currentIndex = startIndex;
    this._loadAndPlay();
    const song = this.queue[this.currentIndex];
    if (song) storage.addToRecentlyPlayed(song);
    this.emit('songchange', { song, queue: this.queue, index: this.currentIndex });
  }

  _loadAndPlay() {
    const song = this.queue[this.currentIndex];
    if (!song) return;

    if (song.isLocal && song.localUrl) {
      this.audio.src = song.localUrl;
    } else if (song.isLocal && song.file) {
      const url = URL.createObjectURL(song.file);
      this._localObjectUrls.set(song.id, url);
      this.audio.src = url;
    } else {
      this.audio.src = getStreamUrl(song.id);
    }
    this._updateMediaSessionMetadata(song);

    this.audio.play().catch((err) => {
      console.warn('[PlayerEngine] Play failed:', err.message);
    });
  }

  playLocalFile(file) {
    const url = URL.createObjectURL(file);
    const song = {
      id: `local_${file.name}_${file.size}`,
      title: file.name.replace(/\.[^/.]+$/, ''), 
      artists: { primary: 'Local File' },
      image: null,
      duration: 0,
      album: 'Local Files',
      isLocal: true,
      localUrl: url,
      file: file,
    };

    this._localObjectUrls.set(song.id, url);
    this.playSong(song);
    this.audio.addEventListener('loadedmetadata', () => {
      song.duration = this.audio.duration;
    }, { once: true });
  }

  playLocalFiles(files) {
    const songs = Array.from(files).map(file => {
      const url = URL.createObjectURL(file);
      const song = {
        id: `local_${file.name}_${file.size}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artists: { primary: 'Local File' },
        image: null,
        duration: 0,
        album: 'Local Files',
        isLocal: true,
        localUrl: url,
        file: file,
      };
      this._localObjectUrls.set(song.id, url);
      return song;
    });

    if (songs.length > 0) {
      this.playSongList(songs, 0);
    }
  }

  togglePlay() {
    if (this.audio.paused) {
      this.audio.play().catch(() => { });
    } else {
      this.audio.pause();
    }
  }

  next() {
    if (this.repeat === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
      return;
    }

    if (this.shuffle) {
      this.currentIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      this.currentIndex++;
      if (this.currentIndex >= this.queue.length) {
        if (this.repeat === 'all') {
          this.currentIndex = 0;
        } else {
          this.currentIndex = this.queue.length - 1;
          this.audio.pause();
          this.emit('statechange', { isPlaying: false });
          return;
        }
      }
    }

    this._loadAndPlay();
    const song = this.queue[this.currentIndex];
    if (song) storage.addToRecentlyPlayed(song);
    this.emit('songchange', { song, queue: this.queue, index: this.currentIndex });
  }

  prev() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = this.repeat === 'all' ? this.queue.length - 1 : 0;
    }

    this._loadAndPlay();
    const song = this.queue[this.currentIndex];
    if (song) storage.addToRecentlyPlayed(song);
    this.emit('songchange', { song, queue: this.queue, index: this.currentIndex });
  }

  _handleTrackEnd() {
    if (this.repeat === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
      return;
    }
    this.next();
  }

  toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(this.repeat);
    this.repeat = modes[(idx + 1) % modes.length];
    this.emit('repeatchange', { repeat: this.repeat });
    this._updatePipRepeatBtn();
  }

  seek(percentage) {
    if (this.audio.duration) {
      this.audio.currentTime = percentage * this.audio.duration;
    }
  }

  setVolume(vol) {
    vol = Math.max(0, Math.min(1, vol));
    this.audio.volume = vol;
    storage.setVolume(vol);
    this.emit('volumechange', { volume: vol });
  }

  getVolume() {
    return this.audio.volume;
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    this.emit('shufflechange', { shuffle: this.shuffle });
  }

  addToQueue(song) {
    if (!this.queue.some((s) => s.id === song.id)) {
      this.queue.push(song);
      this.emit('queuechange', { queue: this.queue });
    }
  }

  removeFromQueue(index) {
    if (index === this.currentIndex) return; 
    const song = this.queue[index];
    if (song?.isLocal && this._localObjectUrls.has(song.id)) {
      URL.revokeObjectURL(this._localObjectUrls.get(song.id));
      this._localObjectUrls.delete(song.id);
    }
    this.queue.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    }
    this.emit('queuechange', { queue: this.queue });
  }

  getQueue() {
    return this.queue;
  }

  getUpNext() {
    return this.queue.slice(this.currentIndex + 1);
  }

  clearQueue() {
    this.queue.forEach((song, i) => {
      if (i !== this.currentIndex && song.isLocal && this._localObjectUrls.has(song.id)) {
        URL.revokeObjectURL(this._localObjectUrls.get(song.id));
        this._localObjectUrls.delete(song.id);
      }
    });

    const currentSong = this.getCurrentSong();
    this.queue = currentSong ? [currentSong] : [];
    this.currentIndex = currentSong ? 0 : -1;
    this.emit('queuechange', { queue: this.queue });
  }
}
const player = new PlayerEngine();
export default player;
