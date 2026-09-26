const fs = require('fs');
const path = require('path');
const config = require('../config');

class CacheCleaner {
  constructor() {
    this.cacheDir = path.join(process.cwd(), '.cache', 'audio');
    this.ttlMillis = 2 * 60 * 60 * 1000; 
    this.checkInterval = 10 * 60 * 1000; 
    this.intervalId = null;
  }

  ensureDirExists() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  start() {
    console.log('[CacheCleaner] Starting cache cleaner service...');
    this.ensureDirExists();
    this.runCleanup(); 
    this.intervalId = setInterval(() => this.runCleanup(), this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[CacheCleaner] Stopped cache cleaner service.');
    }
  }

  runCleanup() {
    try {
      this.ensureDirExists();
      console.log('[CacheCleaner] Running cleanup check...');
      const now = Date.now();
      const files = fs.readdirSync(this.cacheDir);
      
      let deletedCount = 0;
      let freedBytes = 0;

      files.forEach((file) => {
        if (!file.endsWith('.m4a') && !file.endsWith('.webm') && !file.endsWith('.tmp')) return;

        const filePath = path.join(this.cacheDir, file);
        try {
          const stats = fs.statSync(filePath);
          const isStaleTmp = file.endsWith('.tmp') && (now - stats.mtimeMs) > (15 * 60 * 1000);
          const isExpiredAudio = (file.endsWith('.webm') || file.endsWith('.m4a')) && (now - stats.mtimeMs) > this.ttlMillis;

          if (isStaleTmp || isExpiredAudio) {
            fs.unlinkSync(filePath);
            deletedCount++;
            freedBytes += stats.size;
          }
        } catch (err) {
          console.warn(`[CacheCleaner] Could not process file ${file}:`, err.message);
        }
      });

      if (deletedCount > 0) {
        console.log(`[CacheCleaner] Deleted ${deletedCount} old files. Freed ${(freedBytes / 1024 / 1024).toFixed(2)} MB.`);
      }
    } catch (err) {
      console.error('[CacheCleaner] Error during cleanup:', err.message);
    }
  }
}

module.exports = new CacheCleaner();
