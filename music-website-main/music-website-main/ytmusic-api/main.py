"""
YTMusic API — FastAPI wrapper for ytmusicapi + yt-dlp
Provides search, song details, streaming URLs, and trending data from YouTube Music.
Runs on port 8001.
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
import yt_dlp
import json
import re

app = FastAPI(title="YTMusic API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize YTMusic (no auth needed for search)
yt = YTMusic()


def _extract_thumbnail(thumbnails):
    """Get highest resolution thumbnail."""
    if not thumbnails:
        return ""
    # Sort by width descending and pick largest
    sorted_thumbs = sorted(thumbnails, key=lambda t: t.get("width", 0), reverse=True)
    return sorted_thumbs[0].get("url", "") if sorted_thumbs else ""


def _artists_string(artists):
    """Convert artists list to string."""
    if not artists:
        return "Unknown"
    if isinstance(artists, str):
        return artists
    if isinstance(artists, list):
        return ", ".join(a.get("name", "") if isinstance(a, dict) else str(a) for a in artists)
    return str(artists)


def _duration_seconds(duration_str):
    """Convert '3:45' or '1:02:30' to seconds."""
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
    """Normalize a ytmusicapi search result to our standard schema."""
    video_id = item.get("videoId", "")
    return {
        "id": f"yt:{video_id}",
        "videoId": video_id,
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


@app.get("/")
def root():
    return {"status": "ok", "service": "ytmusic-api", "version": "1.0.0"}


@app.get("/ping")
def ping():
    return {"status": "healthy", "service": "ytmusic-api"}


@app.get("/search")
def search_songs(q: str = Query(..., description="Search query"), limit: int = Query(20, ge=1, le=50)):
    """Search for songs on YouTube Music."""
    try:
        results = yt.search(q, filter="songs", limit=limit)
        songs = [_normalize_song(r) for r in results if r.get("videoId")]
        return songs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/song/get")
def get_song(video_id: str = Query(..., description="YouTube video ID")):
    """Get song details by video ID."""
    try:
        # Get song info from YTMusic
        song_info = yt.get_song(video_id)
        if not song_info:
            raise HTTPException(status_code=404, detail="Song not found")

        video_details = song_info.get("videoDetails", {})
        
        return {
            "id": f"yt:{video_id}",
            "videoId": video_id,
            "title": video_details.get("title", ""),
            "album": "",
            "year": "",
            "duration": int(video_details.get("lengthSeconds", 0)),
            "artists": {
                "primary": video_details.get("author", ""),
                "featured": "",
                "singers": video_details.get("author", ""),
            },
            "image": _extract_thumbnail(video_details.get("thumbnail", {}).get("thumbnails", [])),
            "language": "",
            "playCount": int(video_details.get("viewCount", 0)),
            "hasLyrics": False,
            "source": "ytmusic",
            "mediaUrl": None,
            "previewUrl": None,
            "permaUrl": f"https://music.youtube.com/watch?v={video_id}",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get song: {str(e)}")


@app.get("/stream")
def get_stream_url(video_id: str = Query(..., description="YouTube video ID")):
    """
    Extract the best audio stream URL for a YouTube Music track using yt-dlp.
    Returns the direct audio URL for proxying.
    """
    try:
        ydl_opts = {
            "format": "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "skip_download": True,
        }
        
        url = f"https://music.youtube.com/watch?v={video_id}"
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
        if not info:
            raise HTTPException(status_code=404, detail="Could not extract stream info")
        
        # Get the direct audio URL
        audio_url = info.get("url")
        if not audio_url:
            # Try to find from formats
            formats = info.get("formats", [])
            audio_formats = [f for f in formats if f.get("vcodec") == "none" and f.get("acodec") != "none"]
            if audio_formats:
                # Sort by audio quality (abr = audio bitrate)
                audio_formats.sort(key=lambda f: f.get("abr", 0) or 0, reverse=True)
                audio_url = audio_formats[0].get("url")
            elif formats:
                audio_url = formats[-1].get("url")
        
        if not audio_url:
            raise HTTPException(status_code=404, detail="No audio stream URL found")
        
        return {
            "url": audio_url,
            "videoId": video_id,
            "title": info.get("title", ""),
            "duration": info.get("duration", 0),
            "ext": info.get("ext", "m4a"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stream extraction failed: {str(e)}")


@app.get("/trending")
def get_trending():
    """Get trending songs from YouTube Music charts."""
    try:
        charts = yt.get_charts(country="IN")
        trending = charts.get("trending", {}).get("items", [])
        if not trending:
            trending = charts.get("videos", {}).get("items", [])
        
        songs = [_normalize_song(item) for item in trending[:20] if item.get("videoId")]
        return songs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trending: {str(e)}")
