const axios = require('axios');
const config = require('../config');

/**
 * Music Service — communicates with the Python YTMusic API
 * Single source for all music operations: search, song details, streaming, trending.
 */
class MusicService {
  constructor() {
    this.baseUrl = config.pythonApiUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
    });
  }

  /**
   * Search for songs
   * @param {string} query - Search term
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Song array
   */
  async searchSongs(query, limit = 20) {
    try {
      const response = await this.client.get('/search', {
        params: { q: query, limit },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`[Music] Search error for "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Get a specific song by ID
   * @param {string} songId - YouTube video ID
   * @returns {Promise<Object|null>} Song object
   */
  async getSongById(songId) {
    try {
      const response = await this.client.get('/song/get', {
        params: { id: songId },
      });
      return response.data || null;
    } catch (error) {
      console.error(`[Music] Get song error for "${songId}":`, error.message);
      return null;
    }
  }

  /**
   * Get the direct audio stream URL for a track
   * @param {string} songId - YouTube video ID
   * @returns {Promise<string>} Direct audio URL
   */
  async getStreamUrl(songId) {
    try {
      const response = await this.client.get('/stream', {
        params: { id: songId },
        timeout: 30000,
      });
      const url = response.data?.url;
      if (!url) throw new Error('No stream URL returned');
      return url;
    } catch (error) {
      console.error(`[Music] Stream error for "${songId}":`, error.message);
      throw new Error(`Failed to get stream: ${error.message}`);
    }
  }

  /**
   * Get trending songs
   * @returns {Promise<Array>} Song array
   */
  async getTrending() {
    try {
      const response = await this.client.get('/trending');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`[Music] Trending error:`, error.message);
      return [];
    }
  }

  /**
   * Health check
   */
  async ping() {
    try {
      const response = await this.client.get('/ping');
      return response.data;
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new MusicService();
