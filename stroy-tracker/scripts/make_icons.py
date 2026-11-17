"""Рисует значок Строй Трекера и нарезает размеры для iPhone и Android.
Также делает заставки запуска для iPhone в светлой и тёмной теме.

python make_icons.py <папка public>
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

PUBLIC = sys.argv[1]
ICONS = os.path.join(PUBLIC, "icons")
SPLASH = os.path.join(PUBLIC, "splash")
os.makedirs(ICONS, exist_ok=True)
os.makedirs(SPLASH, exist_ok=True)

M = 1024  # размер мастер значка


def vgrad(size, top, bottom):
    """Вертикальный градиент."""
    g = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / (size - 1)
        g.putpixel((0, y), tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g.resize((size, size))


def master(scale=0.62):
    """Мастер значок 1024: синий градиент, белые столбики с тенью, оранжевая верхушка."""
    im = vgrad(M, (64, 156, 255), (0, 92, 214)).convert("RGBA")

    # мягкий блик сверху
    glow = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([-M * 0.2, -M * 0.75, M * 1.2, M * 0.45], fill=(255, 255, 255, 40))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(120)))

    box = M * scale
    x0 = (M - box) / 2
    base = (M - box) / 2 + box * 0.94
    bw = box * 0.25
    gap = box * 0.075
    total = bw * 3 + gap * 2
    sx = x0 + (box - total) / 2
    heights = [0.40, 0.66, 0.96]
    r = bw * 0.24

    bars = []
    for i, h in enumerate(heights):
        left = sx + i * (bw + gap)
        top = base - box * h * 0.92
        bars.append((left, top, left + bw, base))

    # тень под столбиками
    shadow = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for (l, t, rr, b) in bars:
        sd.rounded_rectangle([l, t + M * 0.012, rr, b + M * 0.012], radius=r, fill=(0, 30, 90, 110))
    im = Image.alpha_composite(im, shadow.filter(ImageFilter.GaussianBlur(M * 0.018)))

    d = ImageDraw.Draw(im)
    for (l, t, rr, b) in bars:
        d.rounded_rectangle([l, t, rr, b], radius=r, fill=(255, 255, 255, 255))

    # оранжевая верхушка на самом высоком столбике с градиентом
    l, t, rr, b = bars[2]
    cap_h = box * 0.17
    cap = vgrad(int(bw), (255, 186, 64), (255, 140, 0)).convert("RGBA").resize((int(rr - l), int(cap_h)))
    mask = Image.new("L", cap.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, cap.size[0] - 1, cap.size[1] + int(r * 2)], radius=r, fill=255)
    im.paste(cap, (int(l), int(t)), mask)
    return im.convert("RGB")


def save_icons():
    big = master(0.62)
    maskable = master(0.50)  # Samsung обрезает края, поэтому рисунок меньше
    for name, img, size in [
        ("apple-touch-icon.png", big, 180),
        ("icon-192.png", big, 192),
        ("icon-512.png", big, 512),
        ("icon-512-maskable.png", maskable, 512),
        ("favicon-32.png", master(0.74), 32),
    ]:
        img.resize((size, size), Image.LANCZOS).save(os.path.join(ICONS, name), optimize=True)
        print("icon", name, size)
    return big


def rounded(img, radius_ratio=0.2237):
    """Скругляет углы как у значков iOS."""
    s = img.size[0]
    mask = Image.new("L", (s * 4, s * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s * 4 - 1, s * 4 - 1], radius=int(s * 4 * radius_ratio), fill=255)
    mask = mask.resize((s, s), Image.LANCZOS)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


# ширина и высота экрана в пунктах, множитель плотности: все iPhone с экраном 750 пикселей и шире
DEVICES = [
    (440, 956, 3), (402, 874, 3), (430, 932, 3), (393, 852, 3), (428, 926, 3),
    (390, 844, 3), (375, 812, 3), (414, 896, 3), (414, 896, 2), (414, 736, 3), (375, 667, 2),
]


def save_splash(icon):
    logo = rounded(icon)
    for w, h, k in DEVICES:
        for theme, bg in [("light", (242, 242, 247)), ("dark", (0, 0, 0))]:
            canvas = Image.new("RGB", (w * k, h * k), bg)
            side = int(min(w, h) * k * 0.26)
            mark = logo.resize((side, side), Image.LANCZOS)
            canvas.paste(mark, ((w * k - side) // 2, (h * k - side) // 2 - int(h * k * 0.03)), mark)
            name = f"splash-{w}x{h}-{k}x-{theme}.png"
            canvas.save(os.path.join(SPLASH, name), optimize=True)
    print("splash", len(DEVICES) * 2)


if __name__ == "__main__":
    save_splash(save_icons())
