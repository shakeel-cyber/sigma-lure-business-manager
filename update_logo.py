import shutil
from PIL import Image

source_image = "/Users/shakeelahmed/.gemini/antigravity/brain/e0ec6fae-8b6b-4104-8cf2-7ef807b41623/media__1786706254644.png"
target_dir = "/Users/shakeelahmed/Desktop/sigma app antigravity"

# Copy original logo
shutil.copy(source_image, f"{target_dir}/logo.png")

# Open image
img = Image.open(source_image)

def create_square_icon(image, size):
    # Create square canvas with black background
    bg = Image.new("RGB", (size, size), (0, 0, 0))
    
    # Calculate aspect ratio resize
    width, height = image.size
    ratio = min(size / width, size / height)
    new_w = int(width * ratio)
    new_h = int(height * ratio)
    
    resized = image.resize((new_w, new_h), Image.LANCZOS)
    
    # Paste centered
    offset_x = (size - new_w) // 2
    offset_y = (size - new_h) // 2
    bg.paste(resized, (offset_x, offset_y))
    return bg

# Create 192x192 icon
icon192 = create_square_icon(img, 192)
icon192.save(f"{target_dir}/icon-192.png")

# Create 512x512 icon
icon512 = create_square_icon(img, 512)
icon512.save(f"{target_dir}/icon-512.png")

# Create 180x180 apple touch icon
apple_icon = create_square_icon(img, 180)
apple_icon.save(f"{target_dir}/apple-touch-icon.png")

print("Logo and PWA icons updated successfully.")
