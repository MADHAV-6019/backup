const express = require('express');
const router = express.Router();
const musicService = require('../services/musicService');

/**
 * GET /api/search?q=...
 * Search for songs via YouTube Music
 */
router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await musicService.searchSongs(q);

    res.json({
      success: true,
      query: q,
      resultCount: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
