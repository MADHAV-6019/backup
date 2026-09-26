/**
 * API Service — fetch wrapper for the Express backend
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[API] ${endpoint}:`, error.message);
    throw error;
  }
}

export async function searchSongs(query) {
  const data = await request(`/search?q=${encodeURIComponent(query)}`);
  return data.results || [];
}

export async function getSong(id) {
  const data = await request(`/songs/${id}`);
  return data.data || null;
}

export async function getSongLyrics(id) {
  const data = await request(`/songs/${id}/lyrics`);
  return data.data || null;
}

export function getStreamUrl(id, quality = 'high') {
  return `${BASE_URL}/songs/${id}/stream?quality=${quality}`;
}

export async function getAlbum(query) {
  const data = await request(`/albums?q=${encodeURIComponent(query)}`);
  return data.data || null;
}

export async function getPlaylist(query) {
  const data = await request(`/playlists?q=${encodeURIComponent(query)}`);
  return data.data || null;
}

export async function getTrending() {
  const data = await request('/home/trending');
  return data.data || [];
}

export async function healthCheck() {
  return request('/health');
}
