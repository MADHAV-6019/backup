"""
Music API — YouTube Music powered by ytmusicapi + yt-dlp
Single unified Python service for search, song details, streaming, and trending.
Runs on port 8000.
"""
import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
import yt_dlp

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Music API", version="2.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize YTMusic
try:
    yt = YTMusic()
    logger.info("✅ YTMusic initialized")
except Exception as e:
    logger.error(f"❌ YTMusic init failed: {e}")
    yt = None


# ═══════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════

def _extract_thumbnail(thumbnails):
    if not thumbnails:
        return ""
    sorted_thumbs = sorted(thumbnails, key=lambda t: t.get("width", 0), reverse=True)
    return sorted_thumbs[0].get("url", "") if sorted_thumbs else ""


def _artists_string(artists):
    if not artists:
        return "Unknown"
    if isinstance(artists, str):
        return artists
    if isinstance(artists, list):
        return ", ".join(a.get("name", "") if isinstance(a, dict) else str(a) for a in artists)
    return str(artists)


def _duration_seconds(duration_str):
    if not duration_str:
        return 0
    if isinstance(duration_str, (int, float)):
        return int(duration_str)
    parts = str(duration_str).split(":")
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        elif len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        return int(parts[0])
    except (ValueError, IndexError):
        return 0


def _normalize_song(item):
    video_id = item.get("videoId", "")
    return {
        "id": video_id,
        "title": item.get("title", ""),
        "album": (item.get("album", {}) or {}).get("name", "") if isinstance(item.get("album"), dict) else (item.get("album", "") or ""),
        "year": item.get("year", ""),
        "duration": _duration_seconds(item.get("duration", item.get("duration_seconds", 0))),
        "artists": {
            "primary": _artists_string(item.get("artists", [])),
            "featured": "",
            "singers": _artists_string(item.get("artists", [])),
        },
        "image": _extract_thumbnail(item.get("thumbnails", [])),
        "language": "",
        "playCount": 0,
        "hasLyrics": False,
        "source": "ytmusic",
        "mediaUrl": None,
        "previewUrl": None,
        "permaUrl": f"https://music.youtube.com/watch?v={video_id}" if video_id else "",
    }


# ═══════════════════════════════════════════════════════════
# Routes
# ═══════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"service": "music-api", "version": "2.0.0", "powered_by": "ytmusic"}


@app.get("/ping")
def ping():
    return {"status": "healthy", "service": "music-api"}


@app.get("/search")
def search_songs(q: str = Query(...), limit: int = Query(20, ge=1, le=50)):
    if not yt:
        raise HTTPException(status_code=503, detail="YTMusic not initialized")
    try:
        results = yt.search(q, filter="songs", limit=limit)
        return [_normalize_song(r) for r in results if r.get("videoId")]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/song/get")
def get_song(id: str = Query(..., description="YouTube video ID")):
    if not yt:
        raise HTTPException(status_code=503, detail="YTMusic not initialized")
    try:
        song_info = yt.get_song(id)
        if not song_info:
            raise HTTPException(status_code=404, detail="Song not found")
        vd = song_info.get("videoDetails", {})
        return {
            "id": id,
            "title": vd.get("title", ""),
            "album": "",
            "year": "",
            "duration": int(vd.get("lengthSeconds", 0)),
            "artists": {
                "primary": vd.get("author", ""),
                "featured": "",
                "singers": vd.get("author", ""),
            },
            "image": _extract_thumbnail(vd.get("thumbnail", {}).get("thumbnails", [])),
            "source": "ytmusic",
            "permaUrl": f"https://music.youtube.com/watch?v={id}",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get song: {str(e)}")


@app.get("/stream")
def get_stream_url(id: str = Query(..., description="YouTube video ID")):
    try:
        ydl_opts = {
            "format": "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "skip_download": True,
        }
        url = f"https://music.youtube.com/watch?v={id}"
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        if not info:
            raise HTTPException(status_code=404, detail="Could not extract stream info")
        audio_url = info.get("url")
        if not audio_url:
            formats = info.get("formats", [])
            audio_formats = [f for f in formats if f.get("vcodec") == "none" and f.get("acodec") != "none"]
            if audio_formats:
                audio_formats.sort(key=lambda f: f.get("abr", 0) or 0, reverse=True)
                audio_url = audio_formats[0].get("url")
            elif formats:
                audio_url = formats[-1].get("url")
        if not audio_url:
            raise HTTPException(status_code=404, detail="No audio stream URL found")
        return {
            "url": audio_url,
            "id": id,
            "title": info.get("title", ""),
            "duration": info.get("duration", 0),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stream extraction failed: {str(e)}")


@app.get("/trending")
def get_trending():
    if not yt:
        raise HTTPException(status_code=503, detail="YTMusic not initialized")
    try:
        charts = yt.get_charts(country="IN")
        trending = charts.get("trending", {}).get("items", [])
        if not trending:
            trending = charts.get("videos", {}).get("items", [])
        return [_normalize_song(item) for item in trending[:20] if item.get("videoId")]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trending: {str(e)}")
