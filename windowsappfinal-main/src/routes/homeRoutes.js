const express = require('express');
const router = express.Router();
const musicService = require('../services/musicService');

const TRENDING_QUERIES = [
  'Arijit Singh',
  'trending hindi songs',
  'latest bollywood',
  'top hits 2025',
  'romantic songs',
];


async function _fetchTrending() {
  const trendingPromises = TRENDING_QUERIES.map(async (query) => {
    try {
      const songs = await musicService.searchSongs(query, 5);
      return { category: query, songs: songs.slice(0, 5) };
    } catch {
      return { category: query, songs: [] };
    }
  });

  const trending = await Promise.all(trendingPromises);
  let filtered = trending.filter((t) => t.songs.length > 0);

  if (filtered.length === 0) {
    try {
      const fallback = await musicService.getTrending();
      if (fallback && fallback.length > 0) {
        filtered = [{
          category: 'Trending',
          songs: fallback.slice(0, 10),
        }];
      }
    } catch (e) {
      console.warn('[Trending] Fallback failed:', e.message);
    }
  }

  return filtered;
}

let _inflight = null;


router.get('/trending', async (req, res, next) => {
  try {
    if (!_inflight) {
      _inflight = _fetchTrending().finally(() => { _inflight = null; });
    }
    const data = await _inflight;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});


// No warmup or background refresh needed without caching
router.warmUpTrending = function() {};
module.exports = router;
