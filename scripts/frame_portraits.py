"""Record transparent portrait margins for CSS framing; never rewrite an image."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
wiki = json.loads((root / 'source/wiki.json').read_text())
lines = ['/* Alpha bounds of preserved wiki portraits. Image bytes remain unchanged. */']
seen = set()
for unit in wiki['units']:
    source = unit.get('image')
    if not source or source in seen:
        continue
    seen.add(source)
    filename = root / ('public' + source)
    if not filename.exists():
        continue
    with Image.open(filename) as image:
        bounds = image.convert('RGBA').getchannel('A').getbbox()
        width, height = image.size
    if not bounds or bounds == (0, 0, width, height):
        continue
    left, top, right, bottom = bounds
    inset = ' '.join(f'{value:.3f}%' for value in [100*top/height, 100*(width-right)/width, 100*(height-bottom)/height, 100*left/width])
    lines.append(f'img[src="{source}"] {{ --portrait-frame: inset({inset}); }}')
(root / 'src/styles/portrait-framing.css').write_text('\n'.join(lines) + '\n')
