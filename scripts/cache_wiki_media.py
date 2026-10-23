"""Copy the original game media referenced by the imported articles. No generated art."""

import concurrent.futures
import hashlib
import io
import json
import time
import urllib.request
from pathlib import Path
from urllib.parse import unquote

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'source/media-library.json'


def canonical(url):
    return unquote(url.split('/revision/')[0]).casefold()


def main():
    inventory = json.loads((ROOT / 'source/image-inventory.json').read_text())
    records = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    portraits = json.loads((ROOT / 'source/original-images.json').read_text())
    existing = {canonical(v['source_url']): v for v in portraits.values() if v.get('url')}
    allowed = []
    for item in inventory:
        name = item['filename'].casefold()
        if name.startswith('gui_') or any(term in name for term in ('wiki-wordmark', 'wiki_wordmark', 'fandom', 'placeholder.png', 'unknown.png')):
            continue
        if canonical(item['key']) in existing:
            prior = existing[canonical(item['key'])]
            records[item['key']] = {**item, **prior}
        elif item['key'] not in records or records[item['key']].get('error'):
            allowed.append(item)

    def fetch(item):
        for attempt in range(2):
            try:
                request = urllib.request.Request(item['source_url'], headers={'User-Agent': 'Mozilla/5.0 (AdventuresWiki public artwork cache)'})
                with urllib.request.urlopen(request, timeout=30) as response:
                    raw = response.read(20 * 1024 * 1024 + 1)
                if len(raw) > 20 * 1024 * 1024:
                    raise ValueError('Original exceeds static file limit')
                with Image.open(io.BytesIO(raw)) as image:
                    image.verify()
                with Image.open(io.BytesIO(raw)) as image:
                    width, height = image.size
                    extension = {'PNG': 'png', 'JPEG': 'jpg', 'WEBP': 'webp', 'GIF': 'gif'}[image.format]
                    animated = getattr(image, 'is_animated', False)
                    original_hash = hashlib.sha256(raw).hexdigest()
                    original_bytes = len(raw)
                    if animated:
                        image.seek(0)
                        poster = image.convert('RGBA')
                        poster.thumbnail((1600, 1600))
                        output = io.BytesIO()
                        poster.save(output, 'WEBP', lossless=True, method=6)
                        raw, extension = output.getvalue(), 'webp'
                filename = hashlib.sha256(item['key'].encode()).hexdigest()[:24] + '.' + extension
                url = '/art/wiki/' + filename
                target = ROOT / 'public' / url.lstrip('/')
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(raw)
                extra = {'animated': True, 'animation_url': item['source_url'], 'source_sha256': original_hash, 'source_bytes': original_bytes, 'original_width': width, 'original_height': height, 'processing': {'type': 'first_frame_lossless', 'generation': False}} if animated else {}
                return item['key'], {**item, 'url': url, 'width': width, 'height': height, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), **extra}
            except Exception as error:
                if attempt:
                    return item['key'], {**item, 'error': type(error).__name__ + ': ' + str(error)[:120]}
                time.sleep(1)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for index, (key, result) in enumerate(pool.map(fetch, allowed), 1):
            records[key] = result
            if index % 20 == 0 or index == len(allowed):
                MANIFEST.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
                print(json.dumps({'downloaded': index, 'total_downloads': len(allowed), 'available': sum(bool(v.get('url')) for v in records.values()), 'failed': sum(bool(v.get('error')) for v in records.values())}), flush=True)
    MANIFEST.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
