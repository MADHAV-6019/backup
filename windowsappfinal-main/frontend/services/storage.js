import { generateId } from '../utils/helpers.js';
import { saveUserData, loadUserData } from './supabaseClient.js';



const KEYS = {
  PLAYLISTS: 'melodyflow_playlists',
  LIKED: 'melodyflow_liked',
  RECENT: 'melodyflow_recent',
  THEME: 'melodyflow_theme',
  VOLUME: 'melodyflow_volume',
  GUEST_MODE: 'melodyflow_guest',
  LOCAL_FILES: 'melodyflow_local_files',
};

let _currentUser = null;
let _syncTimeout = null;

export function initStorage(user) {
  _currentUser = user || null;
}

export function isGuestMode() {
  return !_currentUser;
}

export function getCurrentUser() {
  return _currentUser;
}

export function setGuestMode(isGuest) {
  try {
    localStorage.setItem(KEYS.GUEST_MODE, JSON.stringify(isGuest));
  } catch (e) {  }
}

export function getGuestModePreference() {
  try {
    const val = localStorage.getItem(KEYS.GUEST_MODE);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

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
  _scheduleSyncToCloud(key);
}

function _scheduleSyncToCloud(key) {
  if (!_currentUser) return;
  clearTimeout(_syncTimeout);
  _syncTimeout = setTimeout(() => _syncKeyToCloud(key), 2000);
}

async function _syncKeyToCloud(key) {
  if (!_currentUser) return;
  try {
    const data = load(key);
    await saveUserData(_currentUser.id, key, data);
  } catch (e) {
    console.warn('[Storage] Cloud sync failed:', e.message);
  }
}

export async function syncAllToCloud() {
  if (!_currentUser) return;
  const keysToSync = [KEYS.PLAYLISTS, KEYS.LIKED, KEYS.RECENT];
  for (const key of keysToSync) {
    await _syncKeyToCloud(key);
  }
}

export async function loadFromCloud() {
  if (!_currentUser) return;
  const keysToLoad = [KEYS.PLAYLISTS, KEYS.LIKED, KEYS.RECENT];
  for (const key of keysToLoad) {
    try {
      const cloudData = await loadUserData(_currentUser.id, key);
      if (cloudData !== null) {
        const localData = load(key, []);
        const merged = _mergeArrayData(cloudData, localData);
        save(key, merged);
      } else {
        await _syncKeyToCloud(key);
      }
    } catch (e) {
      console.warn('[Storage] Cloud load failed for', key, e.message);
    }
  }
}

function _mergeArrayData(cloudArr, localArr) {
  if (!Array.isArray(cloudArr)) return localArr || [];
  if (!Array.isArray(localArr)) return cloudArr;
  const merged = [...cloudArr];
  const existingIds = new Set(merged.map(item => item.id));
  for (const localItem of localArr) {
    if (localItem.id && !existingIds.has(localItem.id)) {
      merged.push(localItem);
    }
  }
  return merged;
}

export function clearUserData() {
  const keysToClear = [KEYS.PLAYLISTS, KEYS.LIKED, KEYS.RECENT];
  for (const key of keysToClear) {
    try {
      localStorage.removeItem(key);
    } catch(e) {}
  }
}

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
  if (pl.songs.some((s) => s.id === song.id)) return false;
  pl.songs.push({
    id: song.id,
    title: song.title,
    artists: song.artists,
    image: song.image,
    duration: song.duration,
    album: song.album,
    isLocal: song.isLocal || false,
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

export function getLikedSongs() {
  return load(KEYS.LIKED, []);
}

export function toggleLike(song) {
  const liked = getLikedSongs();
  const index = liked.findIndex((s) => s.id === song.id);
  if (index >= 0) {
    liked.splice(index, 1);
    save(KEYS.LIKED, liked);
    return false; 
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
    return true; 
  }
}

export function isLiked(songId) {
  return getLikedSongs().some((s) => s.id === songId);
}

export function getRecentlyPlayed() {
  return load(KEYS.RECENT, []);
}

export function addToRecentlyPlayed(song) {
  if (song.isLocal) return; 
  let recent = getRecentlyPlayed().filter((s) => s.id !== song.id);
  recent.unshift({
    id: song.id,
    title: song.title,
    artists: song.artists,
    image: song.image,
    duration: song.duration,
    album: song.album,
  });
  recent = recent.slice(0, 20); 
  save(KEYS.RECENT, recent);
}

export function getTheme() {
  return load(KEYS.THEME, 'melodyflow');
}

export function setTheme(theme) {
  save(KEYS.THEME, theme);
}

export function getVolume() {
  return load(KEYS.VOLUME, 0.7);
}

export function setVolume(vol) {
  save(KEYS.VOLUME, vol);
}

export function getLocalFilesMetadata() {
  return load(KEYS.LOCAL_FILES, []);
}

export function saveLocalFileMetadata(fileInfo) {
  const files = getLocalFilesMetadata();
  const existing = files.findIndex(f => f.id === fileInfo.id);
  if (existing >= 0) {
    files[existing] = fileInfo;
  } else {
    files.push(fileInfo);
  }
  try {
    localStorage.setItem(KEYS.LOCAL_FILES, JSON.stringify(files));
  } catch (e) {  }
}

export function removeLocalFileMetadata(id) {
  const files = getLocalFilesMetadata().filter(f => f.id !== id);
  try {
    localStorage.setItem(KEYS.LOCAL_FILES, JSON.stringify(files));
  } catch (e) {  }
}
