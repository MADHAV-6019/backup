const axios = require('axios');
const musicService = require('./musicService');

class StreamService {
  /**
   * Stream audio for a song via the Python API's yt-dlp extraction.
   * Gets the direct audio URL and proxies the stream to the client.
   */
  async streamSong(songId, req, res) {
    try {
      const mediaUrl = await musicService.getStreamUrl(songId);

      const upstreamHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
      if (req.headers.range) {
        upstreamHeaders['Range'] = req.headers.range;
      }

      const upstreamResponse = await axios({
        method: 'GET',
        url: mediaUrl,
        responseType: 'stream',
        headers: upstreamHeaders,
        timeout: 30000,
      });

      // Forward headers
      ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach((h) => {
        if (upstreamResponse.headers[h]) res.setHeader(h, upstreamResponse.headers[h]);
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

      if (upstreamResponse.status === 206) {
        res.status(206);
      } else {
        if (!res.getHeader('content-type')) {
          res.setHeader('content-type', 'audio/webm');
        }
        res.setHeader('accept-ranges', 'bytes');
        res.status(200);
      }

      upstreamResponse.data.pipe(res);

      upstreamResponse.data.on('error', (err) => {
        console.error('[Stream] Error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Stream error' });
      });
    } catch (error) {
      console.error(`[Stream] Error for ${songId}:`, error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream song' });
      }
    }
  }
}

module.exports = new StreamService();
