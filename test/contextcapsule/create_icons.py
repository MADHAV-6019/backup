import urllib.request

# Download some generic placeholder icons or create simple colored squares
# Actually let's just create a very simple valid PNG using a small base64 string
import base64

# A 1x1 transparent pixel png
png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
png_data = base64.b64decode(png_base64)

for size in [16, 48, 128]:
    with open(f"icon{size}.png", "wb") as f:
        f.write(png_data)

print("Icons created.")
