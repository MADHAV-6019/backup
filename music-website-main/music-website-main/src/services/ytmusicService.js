const axios = require('axios');
const config = require('../config');

/**
 * YTMusic Service — communicates with the ytmusic-api Python FastAPI service
 * Mirrors the JioSaavnService interface for seamless integration.
 */
class YTMusicService {
  constructor() {
    this.baseUrl = config.ytmusicApiUrl.replace(/\/?$/, '/');
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
    });
    this._available = null; // cached availability check
  }

  /**
   * Check if the YTMusic API is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (this._available !== null) return this._available;
    try {
      const res = await this.client.get('ping', { timeout: 3000 });
      this._available = res.data?.status === 'healthy';
    } catch {
      this._available = false;
    }
    // Re-check every 30 seconds
    setTimeout(() => { this._available = null; }, 30000);
    return this._available;
  }

  /**
   * Search for songs on YouTube Music
   * @param {string} query - Search term
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Normalized song array
   */
  async searchSongs(query, limit = 20) {
    try {
      const response = await this.client.get('search', {
        params: { q: query, limit },
      });
      // The Python API already returns normalized data
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`[YTMusic] Search error for "${query}":`, error.message);
      return []; // Return empty — don't break the whole search
    }
  }

  /**
   * Get a specific song by its video ID
   * @param {string} videoId - YouTube video ID (without yt: prefix)
   * @returns {Promise<Object|null>} Song object
   */
  async getSongById(videoId) {
    try {
      const response = await this.client.get('song/get', {
        params: { video_id: videoId },
      });
      return response.data || null;
    } catch (error) {
      console.error(`[YTMusic] Get song error for "${videoId}":`, error.message);
      return null;
    }
  }

  /**
   * Get the direct audio stream URL for a YT Music track
   * Uses yt-dlp on the Python side to extract the stream
   * @param {string} videoId - YouTube video ID (without yt: prefix)
   * @returns {Promise<string>} Direct audio URL
   */
  async getStreamUrl(videoId) {
    try {
      const response = await this.client.get('stream', {
        params: { video_id: videoId },
        timeout: 30000, // yt-dlp can be slow
      });
      const url = response.data?.url;
      if (!url) throw new Error('No stream URL returned');
      return url;
    } catch (error) {
      console.error(`[YTMusic] Stream error for "${videoId}":`, error.message);
      throw new Error(`Failed to get YTMusic stream: ${error.message}`);
    }
  }

  /**
   * Get trending songs from YT Music
   * @returns {Promise<Array>} Normalized song array
   */
  async getTrending() {
    try {
      const response = await this.client.get('trending');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`[YTMusic] Trending error:`, error.message);
      return [];
    }
  }

  /**
   * Health check
   * @returns {Promise<Object>}
   */
  async ping() {
    try {
      const response = await this.client.get('ping');
      return response.data;
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new YTMusicService();
