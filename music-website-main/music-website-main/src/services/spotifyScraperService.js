const axios = require('axios');
const cheerio = require('cheerio');

class SpotifyScraperService {
  constructor(delay = 1000) {
    this.delay = delay;
    this.client = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });
  }

  /**
   * Rate-limited page fetch
   */
  async _getPage(url) {
    try {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      console.error(`[SpotifyScraper] Error fetching ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Scrape artist page for bio, top tracks, albums, monthly listeners
   * @param {string} artistUrl - Spotify artist URL
   * @returns {Promise<Object|null>}
   */
  async scrapeArtist(artistUrl) {
    console.log(`[SpotifyScraper] Scraping artist: ${artistUrl}`);
    const html = await this._getPage(artistUrl);
    if (!html) return null;

    const $ = cheerio.load(html);

    return {
      url: artistUrl,
      monthlyListeners: this._extractMonthlyListeners($),
      topTracks: this._extractTopTracks($),
      albums: this._extractAlbums($),
      bio: this._extractBio($),
    };
  }

  /**
   * Scrape playlist page for tracks and followers
   * @param {string} playlistUrl - Spotify playlist URL
   * @returns {Promise<Object|null>}
   */
  async scrapePlaylist(playlistUrl) {
    console.log(`[SpotifyScraper] Scraping playlist: ${playlistUrl}`);
    const html = await this._getPage(playlistUrl);
    if (!html) return null;

    const $ = cheerio.load(html);

    return {
      url: playlistUrl,
      tracks: this._extractPlaylistTracks($),
      followers: this._extractFollowers($),
    };
  }

  /**
   * Search Spotify for artists, albums, playlists, tracks
   * @param {string} query - Search term
   * @param {string} type - 'artist', 'album', 'playlist', 'track'
   * @param {number} limit - Max results
   * @returns {Promise<Array>}
   */
  async search(query, type = 'artist', limit = 20) {
    const searchUrl = `https://open.spotify.com/search/${type}/${encodeURIComponent(query)}`;
    console.log(`[SpotifyScraper] Searching for: ${query}`);

    const html = await this._getPage(searchUrl);
    if (!html) return [];

    const $ = cheerio.load(html);
    return this._extractSearchResults($, type, limit);
  }

  // ─── Extraction helpers ──────────────────────────────────────

  _extractMonthlyListeners($) {
    const selectors = [
      '[data-testid="monthlyListenersTitle"]',
      '.monthly-listeners',
      '.infoBoxText',
    ];

    for (const selector of selectors) {
      const elem = $(selector).first();
      if (elem.length) {
        const text = elem.text().trim();
        const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:monthly|mo)\.?/i);
        if (match) {
          return match[1].replace(/,/g, '');
        }
      }
    }
    return null;
  }

  _extractTopTracks($) {
    const tracks = [];
    $('a[href*="/track/"]')
      .slice(0, 10)
      .each((_, elem) => {
        const $elem = $(elem);
        const ariaLabel = $elem.attr('aria-label') || '';
        tracks.push({
          name: ariaLabel.split('by')[0].trim(),
          url: new URL($elem.attr('href') || '', 'https://open.spotify.com').href,
          popularity: $elem.attr('data-position') || null,
        });
      });
    return tracks;
  }

  _extractAlbums($) {
    const albums = [];
    $('a[href*="/album/"], a[href*="/collection/"]')
      .slice(0, 20)
      .each((_, elem) => {
        const $elem = $(elem);
        albums.push({
          name: $elem.text().trim(),
          url: new URL($elem.attr('href') || '', 'https://open.spotify.com').href,
        });
      });
    return albums;
  }

  _extractBio($) {
    const selectors = ['[data-testid="about-text"]', '.artist-bio'];
    for (const selector of selectors) {
      const elem = $(selector).first();
      if (elem.length) {
        return elem.text().trim().substring(0, 500);
      }
    }
    return null;
  }

  _extractPlaylistTracks($) {
    const tracks = [];
    $('a[href*="/track/"]')
      .slice(0, 100)
      .each((_, elem) => {
        const $elem = $(elem);
        const ariaLabel = $elem.attr('aria-label') || '';
        tracks.push({
          name: ariaLabel.split('by')[0].trim(),
          url: new URL($elem.attr('href') || '', 'https://open.spotify.com').href,
          duration: $elem.attr('data-duration') || null,
        });
      });
    return tracks;
  }

  _extractFollowers($) {
    const selectors = [
      '[data-testid="playlist-followers"]',
      '[data-testid="entity-followers"]',
    ];
    for (const selector of selectors) {
      const elem = $(selector).first();
      if (elem.length) {
        return elem.text().trim();
      }
    }
    return null;
  }

  _extractSearchResults($, resultType, limit) {
    const results = [];
    $(`a[href*="/${resultType}/"]`)
      .slice(0, limit)
      .each((_, elem) => {
        const $elem = $(elem);
        results.push({
          name: $elem.text().trim(),
          url: new URL($elem.attr('href') || '', 'https://open.spotify.com').href,
          type: resultType,
        });
      });
    return results;
  }
}

module.exports = new SpotifyScraperService();
