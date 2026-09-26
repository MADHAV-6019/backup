import urllib.request
import json

url = "https://chatgpt.com/share/6756ab3d-4c3c-800b-a19f-4d32a9cd8f11" # Just a made up uuid, probably will 404. Let's see if we get cloudflare.
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        print(f"Status: {response.status}")
        if "__NEXT_DATA__" in html:
            print("Found __NEXT_DATA__")
        else:
            print("No __NEXT_DATA__ found. Length of HTML:", len(html))
except Exception as e:
    print(f"Error: {e}")
