import os
from rembg import remove
from PIL import Image

players_dir = "public/players"
images = [f for f in os.listdir(players_dir) if f.endswith(".jpg")]

print(f"Starting background removal for {len(images)} player photos...")

for img_name in sorted(images):
    player_id = img_name.split(".")[0]
    jpg_path = os.path.join(players_dir, img_name)
    png_path = os.path.join(players_dir, f"{player_id}.png")
    
    print(f"Processing: {img_name} -> {player_id}.png")
    try:
        input_image = Image.open(jpg_path)
        output_image = remove(input_image)
        output_image.save(png_path)
        print(f"Successfully saved: {png_path}")
    except Exception as e:
        print(f"Error processing {img_name}: {e}")

print("Background removal complete!")
