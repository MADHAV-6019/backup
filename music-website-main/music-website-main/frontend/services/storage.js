import { generateId } from '../utils/helpers.js';

/**
 * LocalStorage service for playlists, liked songs, preferences
 */

const KEYS = {
  PLAYLISTS: 'melodyflow_playlists',
  LIKED: 'melodyflow_liked',
  RECENT: 'melodyflow_recent',
  THEME: 'melodyflow_theme',
  VOLUME: 'melodyflow_volume',
};

function load(key, fallback = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Storage] Save failed:', e.message);
  }
}

// ─── Playlists ──────────────────────────────────────────────

export function getPlaylists() {
  return load(KEYS.PLAYLISTS, []);
}

export function createPlaylist(name) {
  const playlists = getPlaylists();
  const playlist = {
    id: generateId(),
    name,
    songs: [],
    createdAt: Date.now(),
  };
  playlists.push(playlist);
  save(KEYS.PLAYLISTS, playlists);
  return playlist;
}

export function deletePlaylist(id) {
  const playlists = getPlaylists().filter((p) => p.id !== id);
  save(KEYS.PLAYLISTS, playlists);
}

export function renamePlaylist(id, newName) {
  const playlists = getPlaylists();
  const pl = playlists.find((p) => p.id === id);
  if (pl) pl.name = newName;
  save(KEYS.PLAYLISTS, playlists);
}

export function addSongToPlaylist(playlistId, song) {
  const playlists = getPlaylists();
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return false;
  // Avoid duplicates
  if (pl.songs.some((s) => s.id === song.id)) return false;
  pl.songs.push({
    id: song.id,
    title: song.title,
    artists: song.artists,
    image: song.image,
    duration: song.duration,
    album: song.album,
  });
  save(KEYS.PLAYLISTS, playlists);
  return true;
}

export function removeSongFromPlaylist(playlistId, songId) {
  const playlists = getPlaylists();
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return;
  pl.songs = pl.songs.filter((s) => s.id !== songId);
  save(KEYS.PLAYLISTS, playlists);
}

export function getPlaylistById(id) {
  return getPlaylists().find((p) => p.id === id) || null;
}

// ─── Liked Songs ────────────────────────────────────────────

export function getLikedSongs() {
  return load(KEYS.LIKED, []);
}

export function toggleLike(song) {
  const liked = getLikedSongs();
  const index = liked.findIndex((s) => s.id === song.id);
  if (index >= 0) {
    liked.splice(index, 1);
    save(KEYS.LIKED, liked);
    return false; // unliked
  } else {
    liked.unshift({
      id: song.id,
      title: song.title,
      artists: song.artists,
      image: song.image,
      duration: song.duration,
      album: song.album,
    });
    save(KEYS.LIKED, liked);
    return true; // liked
  }
}

export function isLiked(songId) {
  return getLikedSongs().some((s) => s.id === songId);
}

// ─── Recently Played ────────────────────────────────────────

export function getRecentlyPlayed() {
  return load(KEYS.RECENT, []);
}

export function addToRecentlyPlayed(song) {
  let recent = getRecentlyPlayed().filter((s) => s.id !== song.id);
  recent.unshift({
    id: song.id,
    title: song.title,
    artists: song.artists,
    image: song.image,
    duration: song.duration,
    album: song.album,
  });
  recent = recent.slice(0, 20); // Keep only last 20
  save(KEYS.RECENT, recent);
}

// ─── Theme ──────────────────────────────────────────────────

export function getTheme() {
  return load(KEYS.THEME, 'melodyflow');
}

export function setTheme(theme) {
  save(KEYS.THEME, theme);
}

// ─── Volume ─────────────────────────────────────────────────

export function getVolume() {
  return load(KEYS.VOLUME, 0.7);
}

export function setVolume(vol) {
  save(KEYS.VOLUME, vol);
}
