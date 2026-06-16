import os
from PIL import Image

players_dir = "public/players"
images = [f for f in os.listdir(players_dir) if f.endswith(".jpg")]

print(f"Found {len(images)} player JPG images.")
for img_name in sorted(images):
    img_path = os.path.join(players_dir, img_name)
    with Image.open(img_path) as img:
        img = img.convert("RGBA")
        w, h = img.size
        # Sample pixels from the four corners
        corners = [
            img.getpixel((0, 0)),
            img.getpixel((w - 1, 0)),
            img.getpixel((0, h - 1)),
            img.getpixel((w - 1, h - 1))
        ]
        print(f"{img_name}: size={w}x{h}, TopLeft={corners[0][:3]}, TopRight={corners[1][:3]}, BottomLeft={corners[2][:3]}, BottomRight={corners[3][:3]}")
