const axios = require('axios');
const config = require('../config');

class JioSaavnService {
  constructor() {
    // Ensure baseUrl ends with '/' for correct axios path resolution
    this.baseUrl = config.jiosaavnApiUrl.replace(/\/?$/, '/');
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
    });
  }

  /**
   * Search for songs by query
   * @param {string} query - Search term
   * @param {boolean} lyrics - Include lyrics (default: false)
   * @param {boolean} songdata - Include full song data (default: true)
   * @returns {Promise<Array>} Array of song objects
   */
  async searchSongs(query, lyrics = false, songdata = true) {
    try {
      const response = await this.client.get('song/', {
        params: { query, lyrics, songdata },
      });
      return this._normalizeSongs(response.data);
    } catch (error) {
      console.error(`[JioSaavn] Search error for "${query}":`, error.message);
      throw new Error(`Failed to search songs: ${error.message}`);
    }
  }

  /**
   * Get a specific song by its ID
   * @param {string} songId - JioSaavn song ID
   * @param {boolean} lyrics - Include lyrics
   * @returns {Promise<Object>} Song object
   */
  async getSongById(songId, lyrics = false) {
    try {
      const response = await this.client.get('song/get', {
        params: { song_id: songId, lyrics },
      });
      const songs = this._normalizeSongs(
        Array.isArray(response.data) ? response.data : [response.data]
      );
      return songs[0] || null;
    } catch (error) {
      console.error(`[JioSaavn] Get song error for ID "${songId}":`, error.message);
      throw new Error(`Failed to get song: ${error.message}`);
    }
  }

  /**
   * Get album details
   * @param {string} query - Album URL or ID
   * @param {boolean} lyrics - Include lyrics
   * @returns {Promise<Object>} Album object
   */
  async getAlbum(query, lyrics = false) {
    try {
      const response = await this.client.get('album/', {
        params: { query, lyrics },
      });
      return this._normalizeAlbum(response.data);
    } catch (error) {
      console.error(`[JioSaavn] Album error for "${query}":`, error.message);
      throw new Error(`Failed to get album: ${error.message}`);
    }
  }

  /**
   * Get playlist details
   * @param {string} query - Playlist URL or ID
   * @param {boolean} lyrics - Include lyrics
   * @returns {Promise<Object>} Playlist object
   */
  async getPlaylist(query, lyrics = false) {
    try {
      const response = await this.client.get('playlist/', {
        params: { query, lyrics },
      });
      return this._normalizePlaylist(response.data);
    } catch (error) {
      console.error(`[JioSaavn] Playlist error for "${query}":`, error.message);
      throw new Error(`Failed to get playlist: ${error.message}`);
    }
  }

  /**
   * Get song lyrics
   * @param {string} query - Song URL, link, or lyrics ID
   * @returns {Promise<Object>} Lyrics object
   */
  async getLyrics(query) {
    try {
      const response = await this.client.get('lyrics/', {
        params: { query },
      });
      return response.data;
    } catch (error) {
      console.error(`[JioSaavn] Lyrics error for "${query}":`, error.message);
      throw new Error(`Failed to get lyrics: ${error.message}`);
    }
  }

  /**
   * Health check for JioSaavn API
   * @returns {Promise<Object>} Health status
   */
  async ping() {
    try {
      const response = await this.client.get('ping');
      return response.data;
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Get the direct streaming URL for a song
   * @param {string} songId - JioSaavn song ID
   * @param {string} quality - 'high' for 320kbps, 'low' for 96kbps preview
   * @returns {Promise<string>} Direct media URL
   */
  async getStreamUrl(songId, quality = 'high') {
    const song = await this.getSongById(songId);
    if (!song) throw new Error('Song not found');

    if (quality === 'high' && song.mediaUrl) {
      return song.mediaUrl;
    } else if (song.previewUrl) {
      return song.previewUrl;
    }

    throw new Error('No streaming URL available for this song');
  }

  // ─── Normalization helpers ───────────────────────────────────

  _normalizeSongs(songs) {
    if (!Array.isArray(songs)) return [];
    return songs.map((song) => ({
      id: song.id,
      title: song.song || song.title || '',
      album: song.album || '',
      year: song.year || '',
      duration: parseInt(song.duration) || 0,
      artists: {
        primary: song.primary_artists || '',
        featured: song.featured_artists || '',
        singers: song.singers || '',
      },
      image: this._getHighResImage(song.image),
      language: song.language || '',
      playCount: parseInt(song.play_count) || 0,
      hasLyrics: song.has_lyrics === 'true',
      copyright: song.copyright_text || '',
      label: song.label || '',
      mediaUrl: song.media_url || null,
      previewUrl: song.media_preview_url || null,
      permaUrl: song.perma_url || '',
      albumUrl: song.album_url || '',
      is320kbps: song['320kbps'] === 'true',
      lyrics: song.lyrics || null,
      albumId: song.albumid || '',
      artistMap: song.artistMap || {},
    }));
  }

  _normalizeAlbum(data) {
    if (!data) return null;
    return {
      id: data.albumid || data.id || '',
      title: data.title || data.album || '',
      year: data.year || '',
      image: this._getHighResImage(data.image),
      artists: data.primary_artists || '',
      songCount: data.song_count || (data.songs ? data.songs.length : 0),
      songs: data.songs ? this._normalizeSongs(data.songs) : [],
      permaUrl: data.perma_url || '',
      language: data.language || '',
      label: data.label || '',
    };
  }

  _normalizePlaylist(data) {
    if (!data) return null;
    return {
      id: data.listid || data.id || '',
      title: data.listname || data.title || '',
      image: this._getHighResImage(data.image),
      songCount: data.list_count || (data.songs ? data.songs.length : 0),
      songs: data.songs ? this._normalizeSongs(data.songs) : [],
      followerCount: data.follower_count || 0,
      fanCount: data.fan_count || 0,
      permaUrl: data.perma_url || '',
      language: data.language || '',
      description: data.description || '',
    };
  }

  _getHighResImage(imageUrl) {
    if (!imageUrl) return '';
    // Replace 150x150 or 50x50 with 500x500 for high-res
    return imageUrl.replace(/\d+x\d+/, '500x500');
  }
}

module.exports = new JioSaavnService();
