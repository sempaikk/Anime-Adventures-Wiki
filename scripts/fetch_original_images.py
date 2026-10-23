"""Cache original game portraits without resizing, upscaling or recompressing them."""

import concurrent.futures
import hashlib
import io
import json
import os
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'source/original-images.json'


def fetch(entry):
    ident, item = entry
    url = item['source_url']
    if not url.startswith('https://static.wikia.nocookie.net/animeadventures/images/'):
        return ident, {'error': 'Source is not the original game image host.'}
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'AdventuresArchive/1.0 (public game artwork cache)'})
            with urllib.request.urlopen(request, timeout=40) as response:
                data = response.read(12 * 1024 * 1024 + 1)
            if len(data) > 12 * 1024 * 1024:
                raise ValueError('Original exceeds image size limit')
            with Image.open(io.BytesIO(data)) as image:
                image.verify()
            with Image.open(io.BytesIO(data)) as image:
                width, height = image.size
                extension = {'PNG': 'png', 'JPEG': 'jpg', 'WEBP': 'webp', 'GIF': 'gif'}[image.format]
            filename = hashlib.sha256(url.encode()).hexdigest()[:24] + '.' + extension
            relative = '/art/originals/' + filename
            path = ROOT / 'public' / relative.lstrip('/')
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            return ident, {'url': relative, 'source_url': url, 'source_page': item['source_page'],
                           'width': width, 'height': height, 'bytes': len(data),
                           'sha256': hashlib.sha256(data).hexdigest()}
        except Exception as error:
            if attempt == 2:
                return ident, {'error': type(error).__name__ + ': ' + str(error)[:180]}
            time.sleep(attempt + 1)


def main():
    bot = Path(os.environ.get('BOT_SOURCE', '/workspace/Anime-Adventures'))
    assets = json.loads((bot / 'data/community_portraits.json').read_text())['assets']
    wiki = json.loads((ROOT / 'source/wiki.json').read_text())
    active = {u['id'] for u in wiki['units'] if u['image'] and not u['retired']}
    existing = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    todo = [(ident, assets[ident]) for ident in active if ident not in existing or 'error' in existing[ident]]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for index, (ident, result) in enumerate(pool.map(fetch, todo), 1):
            existing[ident] = result
            MANIFEST.write_text(json.dumps(existing, ensure_ascii=False, indent=2) + '\n')
            if index % 25 == 0 or index == len(todo):
                print(json.dumps({'completed': index, 'total': len(todo), 'failed': sum('error' in v for v in existing.values())}), flush=True)


if __name__ == '__main__':
    main()
