const axios = require('axios');
const config = require('../config');


class YTMusicService {
  constructor() {
    this.baseUrl = config.ytmusicApiUrl.replace(/\/?$/, '/');
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
    });
    this._available = null; 
  }

  
  async isAvailable() {
    if (this._available !== null) return this._available;
    try {
      const res = await this.client.get('ping', { timeout: 3000 });
      this._available = res.data?.status === 'healthy';
    } catch {
      this._available = false;
    }
    setTimeout(() => { this._available = null; }, 30000);
    return this._available;
  }

  
  async searchSongs(query, limit = 20) {
    try {
      const response = await this.client.get('search', {
        params: { q: query, limit },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`[YTMusic] Search error for "${query}":`, error.message);
      return []; 
    }
  }

  
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

  
  async getStreamUrl(videoId) {
    try {
      const response = await this.client.get('stream', {
        params: { video_id: videoId },
        timeout: 30000, 
      });
      const url = response.data?.url;
      if (!url) throw new Error('No stream URL returned');
      return url;
    } catch (error) {
      console.error(`[YTMusic] Stream error for "${videoId}":`, error.message);
      throw new Error(`Failed to get YTMusic stream: ${error.message}`);
    }
  }

  
  async getTrending() {
    try {
      const response = await this.client.get('trending');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`[YTMusic] Trending error:`, error.message);
      return [];
    }
  }

  
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
