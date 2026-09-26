const express = require('express');
const router = express.Router();
const spotifyScraperService = require('../services/spotifyScraperService');

/**
 * GET /api/artists/search?q=...
 * Search for artists using Spotify scraper
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    if (!q) return res.status(400).json({ error: 'Query "q" is required' });

    const results = await spotifyScraperService.search(q, 'artist', parseInt(limit) || 10);
    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/artists/info?url=...
 * Get artist details from Spotify by URL
 */
router.get('/info', async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Query "url" is required' });

    // Validate it's a Spotify artist URL
    if (!url.includes('open.spotify.com/artist/')) {
      return res.status(400).json({ error: 'Invalid Spotify artist URL' });
    }

    const artistData = await spotifyScraperService.scrapeArtist(url);
    if (!artistData) {
      return res.status(404).json({ error: 'Artist not found or scraping failed' });
    }

    res.json({ success: true, data: artistData });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
