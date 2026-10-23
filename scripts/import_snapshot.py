"""Import the complete collected public text snapshot with revision provenance."""

import hashlib
import json
import re
import shutil
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOT = Path('/workspace/Anime-Adventures')
CORPUS = Path('/workspace/research/anime-adventures-wiki/corpus')


def key(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text).casefold() if c.isalnum())


def slug(text, ident):
    name = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', name).strip('-')[:90] + '-' + str(ident)


def main():
    pages = json.loads((CORPUS / 'page_catalogue.json').read_text())
    assets = json.loads((BOT / 'data/community_portraits.json').read_text())['assets']
    catalog = json.loads((BOT / 'data/community_catalog.json').read_text())['units']
    retired = json.loads((BOT / 'data/tier_availability.json').read_text())['retired']
    media = json.loads((BOT / 'data/media.json').read_text())['assets']
    names = {}
    for unit in catalog:
        for name in [unit['name'], *unit.get('aliases', [])]:
            names[key(name)] = unit
    articles = []
    all_sources = []
    unit_pages = {}
    raw_dir = ROOT / 'source/raw'
    raw_dir.mkdir(parents=True, exist_ok=True)
    public_art = ROOT / 'public/art'
    public_art.mkdir(parents=True, exist_ok=True)
    for page in pages:
        raw = (CORPUS / page['content_file']).read_bytes()
        ident = page['pageid']
        (raw_dir / f'{ident}.wiki').write_bytes(raw)
        record = {**page, 'slug': slug(page['title'], ident), 'sha256': hashlib.sha256(raw).hexdigest()}
        all_sources.append(record)
        if page['namespace'] != 0 or page.get('redirect_target'):
            continue
        unit = names.get(key(page['title']))
        text = raw.decode()
        plain = re.sub(r'\[\[(?:File|Image):.*?\]\]|<[^>]*>|\{\{[^}]*\}\}|__\w+__', ' ', text, flags=re.S)
        plain = re.sub(r"\[\[([^]|]+)\|([^]]+)\]\]", r'\2', plain)
        plain = re.sub(r'\[\[([^]]+)\]\]', r'\1', plain)
        record['excerpt'] = re.sub(r"\s+", ' ', plain.replace("'''", '').replace("''", '')).strip()[:240]
        record['kind'] = 'unit' if unit else 'guide'
        record['unit_id'] = unit['id'] if unit else None
        record['rarity'] = next((r for r in ('Secret', 'Mythic', 'Legendary', 'Epic', 'Rare', 'Exclusive') if any(f'Category:{alias}{suffix}' in page['categories'] for alias in ([r, 'Mythical'] if r == 'Mythic' else [r]) for suffix in ('', ' Units'))), '')
        record['rendered'] = (ROOT / 'source/rendered' / f'{ident}.json').exists()
        articles.append(record)
        if unit:
            unit_pages[unit['id']] = record
    units = []
    for unit in catalog:
        item = assets.get(unit['id'])
        image = None
        if item and (BOT / item['path']).is_file() and unit['id'] not in retired:
            target = public_art / Path(item['path']).name
            shutil.copyfile(BOT / item['path'], target)
            image = '/art/' + target.name
        page = unit_pages.get(unit['id'])
        units.append({**unit, 'image': image, 'article': page['slug'] if page else None,
                      'rarity': page['rarity'] if page else '', 'retired': unit['id'] in retired,
                      'image_source': item.get('source_page') if item else None})
    icon_keys = ['units', 'items', 'ticket', 'fruit', 'remnant', 'gems', 'damage', 'clock', 'range']
    icons = {}
    ui_manifest = json.loads((BOT / 'data/ui_icons.json').read_text())
    # UI art is selected by original game filename, never website artwork.
    approved = {'Stars.png', 'Unit_Storage.png', 'Summon_Ticket.png', 'Star_Fruit.png',
                'Star_Remnant.png', 'Gems.png', 'Damage_icon.png', 'SPA_icon.png', 'Range_icon.png'}
    for name, item in media.items():
        if item.get('source_file') in approved or name == 'banner-summon':
            target = public_art / Path(item['path']).name
            shutil.copyfile(BOT / item['path'], target)
            icons[name] = {'url': '/art/' + target.name, 'source': item.get('source_page'), 'filename': item.get('source_file')}
    supplement = CORPUS.parent / 'additional_maps'
    map_record = json.loads((supplement / '1682.json').read_text())
    map_raw = (supplement / '1682.source.json').read_bytes()
    assert hashlib.sha256(map_raw).hexdigest() == map_record['content_sha256']
    (raw_dir / '1682.wiki').write_bytes(map_raw)
    all_sources.append({**map_record, 'slug': slug(map_record['title'], 1682), 'sha256': map_record['content_sha256']})
    game_map = {'source': map_record, 'data': json.loads(map_raw), 'image': '/art/lobby-map.png'}
    taxonomy = json.loads((CORPUS / 'category_memberships.json').read_text())['categories']
    result = {'articles': articles, 'sources': all_sources, 'units': units, 'icons': icons, 'map': game_map,
              'categories': taxonomy, 'aliases': {p['title']: p['redirect_target'] for p in pages if p.get('redirect_target')},
              'license': {'text': 'CC-BY-SA', 'url': 'https://www.fandom.com/licensing', 'source': 'Anime Adventures Wiki'},
              'counts': {'articles': len(articles), 'sources': len(all_sources), 'units': len(units),
                         'portraits': sum(bool(u['image']) for u in units), 'rendered': sum(p['rendered'] for p in articles)}}
    (ROOT / 'source/wiki.json').write_text(json.dumps(result, ensure_ascii=False))
    search = [{'title': p['title'], 'url': '/artigo/' + p['slug'] + '/', 'excerpt': p['excerpt'], 'kind': p['kind']} for p in articles]
    search.append({'title': 'Anime Adventures Map', 'url': '/mapa/', 'excerpt': game_map['data']['description'], 'kind': 'guide'})
    (ROOT / 'public/data/search.json').write_text(json.dumps(search, ensure_ascii=False))
    (ROOT / 'public/data/coverage.json').write_text(json.dumps(result['counts']))
    print(json.dumps(result['counts']))
    print('icons:', ', '.join(icons))


if __name__ == '__main__':
    main()
