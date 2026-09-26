const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'api_cache.json');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

class SharedCache {
  constructor() {
    this.localCache = {};
    this.lastMtimeMs = 0;
  }

  
  _sync() {
    try {
      if (!fs.existsSync(CACHE_FILE)) {
        return;
      }
      
      const stats = fs.statSync(CACHE_FILE);
      if (stats.mtimeMs > this.lastMtimeMs) {
        const data = fs.readFileSync(CACHE_FILE, 'utf8');
        if (data) {
          this.localCache = JSON.parse(data);
          this.lastMtimeMs = stats.mtimeMs;
        }
      }
    } catch (e) {
      if (e.code === 'ENOENT') {
        this.localCache = {};
        this.lastMtimeMs = 0;
      }
    }
    this._cleanup();
  }

  _cleanup() {
    let changed = false;
    const now = Date.now();
    for (const key in this.localCache) {
      if (this.localCache[key].expiry <= now) {
        delete this.localCache[key];
        changed = true;
      }
    }
  }

  
  _flush() {
    try {
      const tmpFile = CACHE_FILE + '.tmp.' + process.pid;
      fs.writeFileSync(tmpFile, JSON.stringify(this.localCache), 'utf8');
      fs.renameSync(tmpFile, CACHE_FILE);
      this.lastMtimeMs = fs.statSync(CACHE_FILE).mtimeMs;
    } catch (e) {
      console.error('[SharedCache] Error flushing to disk:', e.message);
    }
  }

  
  get(key) {
    this._sync();
    const item = this.localCache[key];
    if (item && item.expiry > Date.now()) {
      return item.value;
    }
    if (item) {
      delete this.localCache[key];
    }
    return undefined;
  }

  
  set(key, value, ttlSeconds) {
    this._sync();
    this.localCache[key] = {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    };
    this._flush();
  }

  
  del(key) {
    this._sync();
    if (this.localCache[key]) {
      delete this.localCache[key];
      this._flush();
    }
  }
}

module.exports = new SharedCache();
