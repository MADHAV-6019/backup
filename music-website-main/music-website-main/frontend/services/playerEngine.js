import { getStreamUrl } from './api.js';
import * as storage from './storage.js';

/**
 * Audio Playback Engine
 * Manages the HTML5 Audio element, queue, and playback state.
 * Uses an event emitter pattern to notify UI components.
 */
class PlayerEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.volume = storage.getVolume();

    this.queue = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.shuffle = false;
    this.repeat = 'off'; // 'off', 'all', 'one'
    this.listeners = {};

    this._setupAudioEvents();
  }

  _setupAudioEvents() {
    this.audio.addEventListener('timeupdate', () => {
      this.emit('timeupdate', {
        currentTime: this.audio.currentTime,
        duration: this.audio.duration || 0,
      });
    });

    this.audio.addEventListener('ended', () => {
      this._handleTrackEnd();
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.emit('statechange', { isPlaying: true });
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.emit('statechange', { isPlaying: false });
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.emit('loaded', {
        duration: this.audio.duration,
      });
    });

    this.audio.addEventListener('error', (e) => {
      console.error('[PlayerEngine] Audio error:', e);
      this.emit('error', { error: 'Failed to load audio' });
    });
  }

  // ─── Event Emitter ────────────────────────────────────────

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

  // ─── Playback Controls ────────────────────────────────────

  getCurrentSong() {
    return this.queue[this.currentIndex] || null;
  }

  playSong(song, clearQueue = false) {
    if (clearQueue) {
      this.queue = [song];
      this.currentIndex = 0;
    } else {
      // Check if song already in queue
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
    this.audio.src = getStreamUrl(song.id);
    this.audio.play().catch((err) => {
      console.warn('[PlayerEngine] Play failed:', err.message);
    });
  }

  togglePlay() {
    if (this.audio.paused) {
      this.audio.play().catch(() => {});
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

  toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(this.repeat);
    this.repeat = modes[(idx + 1) % modes.length];
    this.emit('repeatchange', { repeat: this.repeat });
  }

  // ─── Queue Management ────────────────────────────────────

  addToQueue(song) {
    // Avoid duplicates
    if (!this.queue.some((s) => s.id === song.id)) {
      this.queue.push(song);
      this.emit('queuechange', { queue: this.queue });
    }
  }

  removeFromQueue(index) {
    if (index === this.currentIndex) return; // can't remove currently playing
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
    const currentSong = this.getCurrentSong();
    this.queue = currentSong ? [currentSong] : [];
    this.currentIndex = currentSong ? 0 : -1;
    this.emit('queuechange', { queue: this.queue });
  }
}

// Singleton
const player = new PlayerEngine();
export default player;
