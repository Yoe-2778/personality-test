"""Prepare the approved illustrations for the website. Requires Pillow."""
from collections import deque
from pathlib import Path
import runpy
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets' / 'cat-reference'
OUTPUT = ROOT / 'assets' / 'cats'
OUTPUT.mkdir(exist_ok=True)


def remove_backdrop(image):
    """Remove only pale paper connected to an image edge; preserve white cats."""
    image = image.convert('RGBA')
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    queue = deque()
    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))
    while queue:
        x, y = queue.popleft()
        if not (0 <= x < width and 0 <= y < height):
            continue
        index = y * width + x
        if visited[index]:
            continue
        visited[index] = 1
        r, g, b, a = pixels[x, y]
        if min(r, g, b) < 229 or max(r, g, b) - min(r, g, b) > 28:
            continue
        pixels[x, y] = (r, g, b, 0)
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    return image


hero = Image.open(SOURCE / 'two-cats-hero.png').crop((620, 180, 1536, 950))
remove_backdrop(hero).resize((824, 693), Image.Resampling.LANCZOS).save(OUTPUT / 'hero.png', optimize=True)
runpy.run_path(str(ROOT / 'scripts' / 'prepare-hero-tears.py'), run_name='__main__')
for i in range(1, 7):
    scene = Image.open(SOURCE / f'scene-{i:02d}.png')
    remove_backdrop(scene).resize((420, 420), Image.Resampling.LANCZOS).save(OUTPUT / f'scene-{i:02d}.png', optimize=True)
Image.open(OUTPUT / 'scene-01.png').resize((64, 64), Image.Resampling.LANCZOS).save(OUTPUT / 'favicon.png', optimize=True)
print('Prepared 8 approved cat assets.')

# Result guide cards have dedicated local tear-removal revisions.
for guide_name in ['guide-care-dry', 'guide-talk-dry', 'guide-rest-dry', 'reflection-gray-dry']:
    guide_source = SOURCE / f'{guide_name}.png'
    if guide_source.exists():
        guide = remove_backdrop(Image.open(guide_source))
        guide.resize((420, 420), Image.Resampling.LANCZOS).save(OUTPUT / f'{guide_name}.png', optimize=True)
        print(f'Prepared {guide_name} illustration.')

# A cheerful shared game closes the result page.
for play_name in ['ending-play', 'ending-play-happy']:
    play_source = SOURCE / f'{play_name}.png'
    if play_source.exists():
        play = remove_backdrop(Image.open(play_source))
        play.resize((420, 420), Image.Resampling.LANCZOS).save(OUTPUT / f'{play_name}.png', optimize=True)
        print(f'Prepared {play_name} illustration.')

# Question one shows the same white cat picking the letter up near its feet.
pickup_source = SOURCE / 'progress-pickup.png'
if pickup_source.exists():
    pickup = remove_backdrop(Image.open(pickup_source))
    pickup = pickup.crop(pickup.getbbox())
    pickup.thumbnail((268, 304), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (280, 320))
    canvas.alpha_composite(pickup, ((280 - pickup.width) // 2, 314 - pickup.height))
    canvas.save(OUTPUT / 'progress-pickup.png', optimize=True)
    print('Prepared the first-question letter pickup sprite.')

# A dedicated mutual hug appears at the top of the result page.
for hug_name in ['result-hug', 'result-hug-pose']:
    hug_source = SOURCE / f'{hug_name}.png'
    if hug_source.exists():
        hug = remove_backdrop(Image.open(hug_source))
        hug.resize((420, 420), Image.Resampling.LANCZOS).save(OUTPUT / f'{hug_name}.png', optimize=True)
        print(f'Prepared {hug_name} illustration.')

# The progress characters come from a separated version of the approved letter scene.
progress_source = SOURCE / 'progress-sprites.png'
if progress_source.exists():
    sheet = Image.open(progress_source)
    for name, box in [('sender', (0, 0, 768, 1024)), ('receiver', (768, 0, 1536, 1024))]:
        sprite = remove_backdrop(sheet.crop(box))
        sprite = sprite.crop(sprite.getbbox())
        sprite.thumbnail((268, 304), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (280, 320))
        canvas.alpha_composite(sprite, ((280 - sprite.width) // 2, 314 - sprite.height))
        canvas.save(OUTPUT / f'progress-{name}.png', optimize=True)
    print('Prepared 2 separate progress cat sprites.')

# Review revisions have their own filenames so approved originals stay available.
if (SOURCE / 'two-cats-hero-pout.png').exists():
    revised_hero = Image.open(SOURCE / 'two-cats-hero-pout.png').crop((620, 180, 1536, 950))
    remove_backdrop(revised_hero).resize((824, 693), Image.Resampling.LANCZOS).save(OUTPUT / 'hero-pout.png', optimize=True)
comfort_source = SOURCE / 'white-cat-comforts-gray-calm.png'
if comfort_source.exists():
    comfort = remove_backdrop(Image.open(comfort_source))
    comfort.resize((420, 420), Image.Resampling.LANCZOS).save(OUTPUT / 'comfort-white.png', optimize=True)
    comfort.resize((64, 64), Image.Resampling.LANCZOS).save(OUTPUT / 'favicon-comfort.png', optimize=True)
