import math
from PIL import Image, ImageDraw, ImageFont

def draw_sigma_icon(size):
    # Create dark background image
    image = Image.new("RGBA", (size, size), (11, 15, 25, 255))
    draw = ImageDraw.Draw(image)
    
    # Outer rounded rect background
    margin = int(size * 0.05)
    radius = int(size * 0.2)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=(21, 28, 44, 255),
        outline=(56, 189, 248, 200),
        width=int(size * 0.015)
    )
    
    # Center Sigma symbol and Lure geometry
    center_x = size // 2
    center_y = size // 2
    
    # Draw sleek metallic neon Sigma 'Σ' shape
    stroke = max(4, int(size * 0.08))
    s = int(size * 0.24)
    
    p1 = (center_x + s, center_y - s)
    p2 = (center_x - s, center_y - s)
    p3 = (center_x, center_y)
    p4 = (center_x - s, center_y + s)
    p5 = (center_x + s, center_y + s)
    
    # Glow / Gradient lines
    glow_color = (56, 189, 248, 255)
    
    draw.line([p1, p2, p3, p4, p5], fill=glow_color, width=stroke, joint='curve')
    
    # Small accent dot (lure eye)
    dot_radius = int(size * 0.035)
    eye_pos = (center_x + s - int(size * 0.04), center_y - s)
    draw.ellipse(
        [eye_pos[0] - dot_radius, eye_pos[1] - dot_radius, eye_pos[0] + dot_radius, eye_pos[1] + dot_radius],
        fill=(16, 185, 129, 255)
    )
    
    return image

if __name__ == "__main__":
    icon_192 = draw_sigma_icon(192)
    icon_192.save("icon-192.png")
    
    icon_512 = draw_sigma_icon(512)
    icon_512.save("icon-512.png")
    
    apple_icon = draw_sigma_icon(180)
    apple_icon.save("apple-touch-icon.png")
    
    print("App icons generated successfully.")
