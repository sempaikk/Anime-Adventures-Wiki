"""Fetch revision-pinned public MediaWiki HTML; cache raw responses, never run Lua/JS."""

import argparse
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CORPUS = Path('/workspace/research/anime-adventures-wiki/corpus')
PRIORITY = ['Traits', 'Items', 'Evolution', 'Story', 'Infinite', 'Raids', 'Portals',
            'Challenges', 'Codes', 'Summoning', 'Relics', 'Agony (Divine)',
            'Agony', 'Daky', 'Daky (Obi)', 'Tier Lists', 'Update Log', 'Unit List']


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False))
    temp.replace(path)


def collect(limit=None, interval=4):
    pages = json.loads((CORPUS / 'page_catalogue.json').read_text())
    pages = [p for p in pages if p['namespace'] == 0 and not p.get('redirect_target')]
    pages.sort(key=lambda p: (PRIORITY.index(p['title']) if p['title'] in PRIORITY else 999, p['title']))
    dest = ROOT / 'source/rendered'
    dest.mkdir(parents=True, exist_ok=True)
    failures = {}
    count = 0
    last = 0
    for page in pages:
        path = dest / f"{page['pageid']}.json"
        if path.exists():
            try:
                cached = json.loads(path.read_text())
                if cached['parse']['revid'] == page['revision_id']:
                    count += 1
                    continue
            except (ValueError, KeyError):
                pass
        if limit is not None and count >= limit:
            break
        time.sleep(max(0, interval - (time.monotonic() - last)))
        parameters = {'action': 'parse', 'oldid': page['revision_id'],
                      'prop': 'text|images|sections|displaytitle', 'format': 'json',
                      'formatversion': 2, 'disableeditsection': 1}
        original = 'https://animeadventures.fandom.com/api.php?' + urlencode(parameters)
        request = Request('https://r.jina.ai/' + original,
                          headers={'User-Agent': 'AdventuresWikiImporter/1.0 (public revision mirror)', 'Accept': 'text/plain'})
        last = time.monotonic()
        try:
            with urlopen(request, timeout=50) as response:
                raw = response.read(12 * 1024 * 1024).decode()
            if 'Markdown Content:' in raw:
                raw = raw.split('Markdown Content:', 1)[1].strip()
            result = json.loads(raw)
            parsed = result['parse']
            if parsed['revid'] != page['revision_id'] or not isinstance(parsed['text'], str):
                raise ValueError('Revision mismatch or invalid rendered text')
            result['_provenance'] = {'url': original, 'fetched_at': datetime.now(timezone.utc).isoformat(),
                                     'sha256': hashlib.sha256(raw.encode()).hexdigest()}
            write(path, result)
            count += 1
            print(json.dumps({'page': page['title'], 'rendered': count, 'total': len(pages)}), flush=True)
        except Exception as error:
            failures[page['title']] = type(error).__name__
            print(json.dumps({'page': page['title'], 'error': type(error).__name__}), flush=True)
        write(ROOT / 'source/render-progress.json', {'rendered': count, 'total': len(pages), 'failures': failures})
    write(ROOT / 'source/render-progress.json', {'rendered': count, 'total': len(pages), 'failures': failures})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit', type=int)
    parser.add_argument('--interval', type=float, default=4)
    args = parser.parse_args()
    collect(args.limit, max(4, args.interval))
