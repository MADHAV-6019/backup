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

import requests



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





try:

    yt = YTMusic()

    logger.info("✅ YTMusic initialized")

except Exception as e:

    logger.error(f"❌ YTMusic init failed: {e}")

    yt = None













def _extract_thumbnail(thumbnails):

    if not thumbnails:

        return ""

    sorted_thumbs = sorted(thumbnails, key=lambda t: t.get("width", 0), reverse=True)

    url = sorted_thumbs[0].get("url", "") if sorted_thumbs else ""
    
    # Upgrade YouTube Music image quality
    if url and ("lh3.googleusercontent.com" in url or "yt3.ggpht.com" in url):
        import re
        url = re.sub(r'=w\d+-h\d+', '=w1200-h1200', url)
    elif url and "i.ytimg.com/vi/" in url:
        # For standard YouTube thumbnails, try to get maxresdefault
        url = url.replace("hqdefault.jpg", "maxresdefault.jpg").replace("sddefault.jpg", "maxresdefault.jpg")
        
    return url





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



@app.get("/artist/info")
def get_artist_info(q: str = Query(..., description="Artist name to search for")):
    """Search for an artist on YTMusic and return their details."""
    if not yt:
        raise HTTPException(status_code=503, detail="YTMusic not initialized")
    try:
        # Search for the artist
        results = yt.search(q, filter="artists", limit=5)
        if not results:
            return {"found": False, "name": q}
        
        artist_result = results[0]
        artist_id = artist_result.get("browseId", "")
        
        # Basic info from search result
        name = artist_result.get("artist", artist_result.get("name", q))
        thumbnail = _extract_thumbnail(artist_result.get("thumbnails", []))
        subscribers = artist_result.get("subscribers", "")
        
        # Try to get full artist details
        description = ""
        top_songs = []
        try:
            if artist_id:
                artist_data = yt.get_artist(artist_id)
                if artist_data:
                    name = artist_data.get("name", name)
                    description = artist_data.get("description", "")
                    thumbnail = _extract_thumbnail(artist_data.get("thumbnails", [])) or thumbnail
                    subscribers = artist_data.get("subscribers", subscribers)
                    
                    # Get top songs
                    songs_data = artist_data.get("songs", {})
                    if isinstance(songs_data, dict):
                        song_results = songs_data.get("results", [])
                    else:
                        song_results = []
                    
                    for s in song_results[:5]:
                        top_songs.append({
                            "title": s.get("title", ""),
                            "videoId": s.get("videoId", ""),
                        })
        except Exception as e:
            logger.warning(f"Failed to get full artist details: {e}")
        
        return {
            "found": True,
            "name": name,
            "browseId": artist_id,
            "thumbnail": thumbnail,
            "subscribers": subscribers,
            "description": description,
            "topSongs": top_songs,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Artist search failed: {str(e)}")



@app.get("/lyrics")

def get_lyrics(id: str = Query(..., description="YouTube video ID")):

    """Fetch synced lyrics from LRCLIB using song title and artist.

    Uses the LRCLIB search endpoint to find multiple candidates, then picks
    the one whose duration most closely matches the YouTube audio. This avoids
    returning lyrics from a different album/cut with mismatched timestamps.
    """

    if not yt:

        raise HTTPException(status_code=503, detail="YTMusic not initialized")

    try:



        song_info = yt.get_song(id)

        if not song_info:

            raise HTTPException(status_code=404, detail="Song not found")

        vd = song_info.get("videoDetails", {})

        title = vd.get("title", "")

        artist = vd.get("author", "")

        duration = int(vd.get("lengthSeconds", 0))



        if not title:

            raise HTTPException(status_code=400, detail="Could not determine song title")





        import re

        clean_title = re.sub(r'\s*[\(\[].*?[\)\]]\s*', ' ', title).strip()



        clean_artist = re.sub(r'\s*-\s*Topic$', '', artist).strip()



        headers = {

            "User-Agent": "MelodyFlow/1.0 (https://github.com/melodyflow)"

        }



        def _pick_best_result(results, target_duration):

            """Pick the best lyrics match from LRCLIB search results.

            Prioritises results with synced lyrics and closest duration match.
            """

            if not results:

                return None





            synced = [r for r in results if r.get("syncedLyrics")]

            pool = synced if synced else results



            if target_duration > 0:



                pool.sort(key=lambda r: abs((r.get("duration") or 0) - target_duration))



            return pool[0] if pool else None





        search_url = "https://lrclib.net/api/search"

        search_params = {

            "track_name": clean_title,

            "artist_name": clean_artist,

        }

        search_resp = requests.get(search_url, params=search_params, headers=headers, timeout=10)



        if search_resp.status_code == 200:

            results = search_resp.json()

            best = _pick_best_result(results, duration)

            if best:

                logger.info(f"[Lyrics] Search match for '{clean_title}' — "

                            f"picked duration={best.get('duration')} (target={duration}), "

                            f"album='{best.get('albumName', '?')}'")

                return {

                    "id": id,

                    "title": title,

                    "artist": artist,

                    "syncedLyrics": best.get("syncedLyrics"),

                    "plainLyrics": best.get("plainLyrics"),

                    "source": "lrclib",

                }





        lrclib_url = "https://lrclib.net/api/get"

        get_params = {

            "track_name": clean_title,

            "artist_name": clean_artist,

        }

        if duration > 0:

            get_params["duration"] = duration



        resp = requests.get(lrclib_url, params=get_params, headers=headers, timeout=10)



        if resp.status_code == 200:

            data = resp.json()

            return {

                "id": id,

                "title": title,

                "artist": artist,

                "syncedLyrics": data.get("syncedLyrics"),

                "plainLyrics": data.get("plainLyrics"),

                "source": "lrclib",

            }





        fts_params = {"q": f"{clean_title} {clean_artist}"}

        fts_resp = requests.get(search_url, params=fts_params, headers=headers, timeout=10)



        if fts_resp.status_code == 200:

            results = fts_resp.json()

            best = _pick_best_result(results, duration)

            if best:

                return {

                    "id": id,

                    "title": title,

                    "artist": artist,

                    "syncedLyrics": best.get("syncedLyrics"),

                    "plainLyrics": best.get("plainLyrics"),

                    "source": "lrclib",

                }





        try:

            watch = yt.get_watch_playlist(id)

            lyrics_id = watch.get("lyrics")

            if lyrics_id:

                lyrics_data = yt.get_lyrics(lyrics_id)

                if lyrics_data:

                    return {

                        "id": id,

                        "title": title,

                        "artist": artist,

                        "syncedLyrics": None,

                        "plainLyrics": lyrics_data.get("lyrics"),

                        "source": "ytmusic",

                    }

        except Exception:

            pass



        raise HTTPException(status_code=404, detail="Lyrics not found")



    except HTTPException:

        raise

    except Exception as e:

        logger.error(f"Lyrics fetch error: {e}")

        raise HTTPException(status_code=500, detail=f"Failed to get lyrics: {str(e)}")





@app.get("/playlist/{playlist_id}")

def get_playlist(playlist_id: str):

    """Fetch a YouTube Music playlist by ID and return normalized tracks."""

    if not yt:

        raise HTTPException(status_code=503, detail="YTMusic not initialized")

    try:

        playlist = yt.get_playlist(playlist_id, limit=300)

        if not playlist:

            raise HTTPException(status_code=404, detail="Playlist not found")



        title = playlist.get("title", "YouTube Music Playlist")

        raw_tracks = playlist.get("tracks", [])

        tracks = [_normalize_song(t) for t in raw_tracks if t.get("videoId")]



        return {

            "title": title,

            "trackCount": len(tracks),

            "tracks": tracks,

        }

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"Failed to get playlist: {str(e)}")





@app.get("/spotify/playlist/{playlist_id}")

def get_spotify_playlist(playlist_id: str):

    """
    Scrape a public Spotify playlist to extract track names and artists.
    Uses the embed page __NEXT_DATA__ to bypass the 30-track limit on public pages.
    """

    import re

    import json



    HEADERS = {

        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",

    }



    try:



        resp = requests.get(

            f"https://open.spotify.com/embed/playlist/{playlist_id}",

            headers=HEADERS,

            timeout=15,

        )

        if resp.status_code == 404:

            raise HTTPException(status_code=404, detail="Spotify playlist not found")

        resp.raise_for_status()



        html = resp.text

        logger.info(f"[Spotify] Fetched embed page, length={len(html)}")





        next_data_match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.+?)</script>', html)

        if not next_data_match:

            raise HTTPException(status_code=400, detail="Could not extract track data from Spotify embed page.")



        data = json.loads(next_data_match.group(1))



        try:

            entity = data['props']['pageProps']['state']['data']['entity']

            playlist_name = entity.get('name', 'Spotify Playlist')

            raw_tracks = entity.get('trackList', [])

        except KeyError:

            raise HTTPException(status_code=400, detail="Unexpected data structure in Spotify embed page.")



        tracks = []

        for t in raw_tracks:

            title = t.get('title')

            subtitle = t.get('subtitle', '')

            if title:





                combined_title = f"{title} by {subtitle}" if subtitle else title

                tracks.append({

                    "title": combined_title,

                })



        logger.info(f"[Spotify] Found {len(tracks)} tracks via embed data")



        return {

            "title": playlist_name,

            "trackCount": len(tracks),

            "tracks": tracks,

        }



    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"Spotify scrape failed: {str(e)}")


# ─── Entry point for PyInstaller bundled exe ──────────────────
if __name__ == "__main__":
    import os
    import uvicorn
    host = os.environ.get("UVICORN_HOST", "127.0.0.1")
    port = int(os.environ.get("UVICORN_PORT", "8000"))
    logger.info(f"Starting Music API on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="warning")

