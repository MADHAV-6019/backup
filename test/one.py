#!/usr/bin/env python3
"""
Spotify API Extractor v2.0 - Bypasses JS rendering
Extracts actual API calls from static HTML
"""

import requests
import re
import json
import time
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import sys

class SpotifyAPIExtractor:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def get_js_apis(self, url):
        """Extract API endpoints from JS-heavy HTML"""
        print(f"[+] Fetching: {url}")
        r = self.session.get(url)
        print(f"[+] Size: {len(r.text)} | Status: {r.status_code}")
        
        # Extract API URLs from script tags
        apis = []
        
        # Spotify client config
        config_match = re.search(r'window\.__SAPISCONFIG__ = ({.*?});', r.text, re.DOTALL)
        if config_match:
            config = json.loads(config_match.group(1))
            print(f"[+] Found SAPISCONFIG: {len(config)} endpoints")
            apis.append(config)
        
        # Track/Artist data patterns
        track_patterns = [
            r'"uri":"spotify:track:([a-zA-Z0-9]+)"',
            r'"track":"spotify:track:([a-zA-Z0-9]+)',
            r'/track/([a-zA-Z0-9]+)'
        ]
        
        artist_patterns = [
            r'"artist":"spotify:artist:([a-zA-Z0-9]+)',
            r'/artist/([a-zA-Z0-9]+)'
        ]
        
        # Extract track IDs
        for pattern in track_patterns:
            tracks = re.findall(pattern, r.text)
            if tracks:
                print(f"[+] Found {len(set(tracks))} track IDs")
                apis.append({"tracks": list(set(tracks))})
        
        # Extract artist IDs  
        for pattern in artist_patterns:
            artists = re.findall(pattern, r.text)
            if artists:
                print(f"[+] Found {len(set(artists))} artist IDs")
                apis.append({"artists": list(set(artists))})
        
        return {
            "url": url,
            "size": len(r.text),
            "apis": apis,
            "track_count": len(re.findall(r'spotify:track:[a-zA-Z0-9]+', r.text)),
            "artist_count": len(re.findall(r'spotify:artist:[a-zA-Z0-9]+', r.text))
        }
    
    def test_api_calls(self, base_url):
        """Test actual Spotify API endpoints"""
        print(f"\n[+] Testing API calls...")
        apis_to_test = [
            "https://api.spotify.com/v1/artists/06HL4z0CvFAxyc27GXpf02",
            "https://spclient.wg.spotify.com/test-service/v1/tracks/4cOdK2wGLETKBW3PvgPWqT", 
            "https://open.spotify.com/get_access_token?reason=transport&productType=web_player"
        ]
        
        for api in apis_to_test:
            try:
                r = self.session.get(api, timeout=5)
                print(f"  {api[:60]}... -> {r.status_code}")
            except:
                print(f"  {api[:60]}... -> TIMEOUT")

def main():
    print("=== Spotify API Extractor v2.0 ===")
    extractor = SpotifyAPIExtractor()
    
    # Test Taylor Swift
    result = extractor.get_js_apis("https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02")
    
    print("\n[+] RESULTS:")
    print(json.dumps(result, indent=2))
    
    # Save raw data
    with open("spotify_api_data.json", "w") as f:
        json.dump(result, f, indent=2)
    
    extractor.test_api_calls("https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02")
    
    print("\n[+] Saved to spotify_api_data.json")
    print("[+] NEXT: Share DevTools Network tab screenshot!")

if __name__ == "__main__":
    main()