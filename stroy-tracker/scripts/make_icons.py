"""Рисует значок Строй Трекера и нарезает размеры для iPhone и Android."""
import sys, os
from PIL import Image, ImageDraw

OUT = sys.argv[1]
BG = (24, 95, 165)      # синий как в приложении
WHITE = (255, 255, 255)
ORANGE = (239, 159, 39)

def draw(size, scale):
    big = size * 4
    im = Image.new("RGB", (big, big), BG)
    d = ImageDraw.Draw(im)
    box = big * scale
    x0 = (big - box) / 2
    y0 = (big - box) / 2
    bw = box * 0.24
    gap = box * 0.08
    total = bw * 3 + gap * 2
    sx = x0 + (box - total) / 2
    base = y0 + box * 0.9
    hs = [0.38, 0.62, 0.9]
    for i, h in enumerate(hs):
        left = sx + i * (bw + gap)
        top = base - box * h * 0.9
        r = bw * 0.18
        d.rounded_rectangle([left, top, left + bw, base], radius=r, fill=WHITE)
    # оранжевая верхушка на самом высоком столбце
    left = sx + 2 * (bw + gap)
    top = base - box * hs[2] * 0.9
    d.rounded_rectangle([left, top, left + bw, top + box * 0.16], radius=bw * 0.18, fill=ORANGE)
    return im.resize((size, size), Image.LANCZOS)

jobs = {
    "apple-touch-icon.png": (180, 0.62),
    "icon-192.png": (192, 0.62),
    "icon-512.png": (512, 0.62),
    "icon-512-maskable.png": (512, 0.5),
    "favicon-32.png": (32, 0.7),
}
os.makedirs(OUT, exist_ok=True)
for name, (s, sc) in jobs.items():
    draw(s, sc).save(os.path.join(OUT, name))
    print("ok", name, s)
