const express = require('express');
const router = express.Router();
const spotifyScraperService = require('../services/spotifyScraperService');
const musicService = require('../services/musicService');


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

router.get('/ytinfo', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query "q" is required' });

    const data = await musicService.getArtistInfo(q);
    if (!data) {
      return res.json({ found: false, name: q });
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/info', async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Query "url" is required' });
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
