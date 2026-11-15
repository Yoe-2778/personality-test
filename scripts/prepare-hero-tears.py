"""Separate the homepage tears from the approved raster without redrawing the cats."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets' / 'cats' / 'hero.png'
OUTPUT = ROOT / 'assets' / 'cats'

hero = Image.open(SOURCE).convert('RGBA')
mask = Image.new('L', hero.size)
draw = ImageDraw.Draw(mask)
# Follow each tear's outer cheek contour, leaving the sparkling eyes intact.
draw.polygon([(138, 314), (143, 304), (153, 298), (164, 297), (173, 301),
              (174, 309), (183, 314), (187, 319), (184, 329), (177, 336),
              (164, 340), (149, 337), (140, 331), (136, 322)], fill=255)
draw.polygon([(366, 282), (371, 273), (382, 270), (393, 274), (400, 284),
              (402, 294), (396, 302), (384, 307), (371, 304), (362, 298),
              (359, 291)], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(1.1))
# Reuse clean neighbouring cheek texture rather than painting a flat patch.
cheek = hero.crop((222, 341, 310, 399)).resize(hero.size)
clean = Image.composite(cheek, hero, mask)
clean.save(OUTPUT / 'hero-tear-base.png', optimize=True)
print('Prepared the homepage tear animation base.')
