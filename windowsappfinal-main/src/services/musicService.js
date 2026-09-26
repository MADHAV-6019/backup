const axios = require('axios');
const config = require('../config');


class MusicService {
  constructor() {
    this.baseUrl = config.pythonApiUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
    });
  }

  
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

  
  invalidateStreamUrl(songId) {
    // No-op: caching removed
  }

  
  async getLyrics(songId) {
    try {
      const response = await this.client.get('/lyrics', {
        params: { id: songId },
        timeout: 15000,
      });
      return response.data || null;
    } catch (error) {
      console.error(`[Music] Lyrics error for "${songId}":`, error.message);
      return null;
    }
  }

  
  async getTrending() {
    try {
      const response = await this.client.get('/trending');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`[Music] Trending error:`, error.message);
      return [];
    }
  }

  async getArtistInfo(artistName) {
    try {
      const response = await this.client.get('/artist/info', {
        params: { q: artistName },
        timeout: 15000,
      });
      return response.data || null;
    } catch (error) {
      console.error(`[Music] Artist info error for "${artistName}":`, error.message);
      return null;
    }
  }

  
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
