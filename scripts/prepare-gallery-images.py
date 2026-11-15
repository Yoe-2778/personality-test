"""Export the sixteen original gallery scenes as transparent website stickers."""
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets' / 'cat-reference' / 'gallery-v1'
OUTPUT = ROOT / 'assets' / 'cats' / 'gallery'
OUTPUT.mkdir(parents=True, exist_ok=True)


def cutout(image):
    image = image.convert('RGBA')
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    queue = deque((x, y) for x in range(width) for y in (0, height - 1))
    queue.extend((x, y) for y in range(height) for x in (0, width - 1))
    while queue:
        x, y = queue.popleft()
        if not (0 <= x < width and 0 <= y < height):
            continue
        index = y * width + x
        if visited[index]:
            continue
        visited[index] = 1
        r, g, b, a = pixels[x, y]
        if a and (min(r, g, b) < 229 or max(r, g, b) - min(r, g, b) > 28):
            continue
        pixels[x, y] = (r, g, b, 0)
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    return image


font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 20)
sheet = Image.new('RGB', (1200, 1280), '#f6f2ed')
draw = ImageDraw.Draw(sheet)
prepared = 0
for number in range(1, 17):
    source = SOURCE / f'source-{number:02d}.png'
    if not source.exists():
        continue
    image = cutout(Image.open(source))
    bounds = image.getbbox()
    if not bounds:
        raise ValueError(f'Empty image: {source}')
    image = image.crop(bounds)
    image.thumbnail((396, 360), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (420, 420))
    canvas.alpha_composite(image, ((420 - image.width) // 2, (420 - image.height) // 2))
    canvas.save(OUTPUT / f'cat-{number:02d}.png', optimize=True)
    tile = canvas.resize((278, 278), Image.Resampling.LANCZOS)
    x = (number - 1) % 4 * 300
    y = (number - 1) // 4 * 320
    sheet.paste(tile, (x + 11, y + 6), tile)
    draw.text((x + 125, y + 288), f'{number:02d}', fill='#78657c', font=font)
    prepared += 1
review = ROOT / 'test-results'
review.mkdir(exist_ok=True)
sheet.save(review / 'gallery-illustrations-contact.png')
print(f'Prepared {prepared}/16 unique gallery illustrations.')
