import os
import shutil
from PIL import Image

source = '/Users/shakeelahmed/.gemini/antigravity/brain/e0ec6fae-8b6b-4104-8cf2-7ef807b41623/media__1786706254644.png'
target_dir = '/Users/shakeelahmed/Desktop/sigma app antigravity'

os.makedirs(target_dir, exist_ok=True)

# Copy logo.png
shutil.copy(source, os.path.join(target_dir, 'logo.png'))

img = Image.open(source)

# Create icons
img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(target_dir, 'icon-192.png'))
img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(target_dir, 'icon-512.png'))
img.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(target_dir, 'apple-touch-icon.png'))

print("Icons generated successfully!")
