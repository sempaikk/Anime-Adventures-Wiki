"""Prepare cached translations of public wiki/UI text. No visitor data is sent.

Reads protected HTML from an extraction JSON file. Names, numbers, links and
media are opaque tokens. Resume uses the cache; builds never call this service.
"""
import argparse
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse
import urllib.request

TOKENS = re.compile(r'ZXQ(?:OPAQUE|NAME|NUM)\d+QXZ')
MARKER = 'data-aw-translate-node'

class Shape(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.records, self.stack, self.text = [], [], []
        self.feed(text)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if set(attrs) != {MARKER}:
            raise ValueError('Unrecognized translated markup')
        ident = attrs[MARKER]
        self.records.append((ident, tag, self.stack[-1][0] if self.stack else None))
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:
            self.stack.append((ident, tag))

    def handle_startendtag(self, tag, attributes):
        self.handle_starttag(tag, attributes)
        if self.stack and self.stack[-1][1] == tag:
            self.stack.pop()

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1][1] != tag:
            raise ValueError('Unbalanced translated markup')
        self.stack.pop()

    def handle_data(self, data):
        self.text.append(data)

def validate(original, translated):
    before, after = Shape(original), Shape(translated)
    if before.stack or after.stack or sorted(before.records) != sorted(after.records):
        raise ValueError('Document structure changed')
    if Counter(TOKENS.findall(original)) != Counter(TOKENS.findall(translated)):
        raise ValueError('Protected content lost or duplicated')
    if re.search(r'\d', TOKENS.sub('', ''.join(after.text))):
        raise ValueError('Unprotected number introduced')

def translate(text, source, target):
    query = urllib.parse.urlencode({'client':'gtx','sl':source,'tl':target,'dt':'t','q':text})
    url = 'https://translate.googleapis.com/translate_a/single?' + query
    request = urllib.request.Request(url, headers={'User-Agent':'AdventuresWikiTranslationBuilder/1.0'})
    with urllib.request.urlopen(request, timeout=45) as response:
        try:
            result = json.load(response)
        except json.JSONDecodeError as error:
            raise RuntimeError('The translation service did not return JSON') from error
    return ''.join(part[0] or '' for part in result[0] if part)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input',type=Path)
    parser.add_argument('output',type=Path)
    args = parser.parse_args()
    corpus = json.loads(args.input.read_text())
    cache = json.loads(args.output.read_text()) if args.output.exists() else {'version':1,'provider':'Google Translate','source':corpus['source'],'target':corpus['target'],'entries':{}}
    entries = cache['entries']
    pending = [(key,text) for key,text in corpus['entries'].items() if key not in entries]
    source, target = corpus['source'].split('-')[0], corpus['target'].split('-')[0]
    failures, completed, last_request = {}, 0, 0.0

    def save():
        args.output.parent.mkdir(parents=True,exist_ok=True)
        temp = args.output.with_suffix('.tmp')
        temp.write_text(json.dumps(cache,ensure_ascii=False,indent=2)+'\n')
        temp.replace(args.output)

    def request(text):
        nonlocal last_request
        for attempt in range(3):
            time.sleep(max(0,.85-(time.monotonic()-last_request)))
            last_request=time.monotonic()
            try:
                return translate(text,source,target)
            except urllib.error.HTTPError as error:
                if error.code not in (429,500,502,503,504):
                    raise
                try:
                    seconds=max(30,int(error.headers.get('Retry-After','30')))*(attempt+1)
                except ValueError:
                    from email.utils import parsedate_to_datetime
                    seconds=max(30,int(parsedate_to_datetime(error.headers['Retry-After']).timestamp()-time.time()))
                print(f'Service retry after HTTP {error.code}; waiting {seconds}s.',flush=True)
                while seconds:
                    wait=min(15,seconds);time.sleep(wait);seconds-=wait
            except (TimeoutError,urllib.error.URLError):
                if attempt==2:raise
                time.sleep(3*(attempt+1))
        raise RuntimeError('Translation service unavailable after retries')

    cursor=0
    print(f'Preparing {len(pending)} missing translations; {len(entries)} cached.',flush=True)
    while cursor<len(pending):
        batch=[]
        while cursor<len(pending) and len(batch)<14:
            candidate=batch+[pending[cursor]]
            text='\n'.join(f'[[AWSEG{i:06}]]\n{value}' for i,(_,value) in enumerate(candidate))
            if batch and len(urllib.parse.quote(text))>6400:break
            batch=candidate;cursor+=1
        combined='\n'.join(f'[[AWSEG{i:06}]]\n{value}' for i,(_,value) in enumerate(batch))
        try:
            translated=request(combined)
            pieces=re.split(r'\[\[AWSEG(\d{6})\]\]',translated)
            if pieces[0].strip() or len(pieces)!=1+len(batch)*2:raise ValueError('Batch boundaries changed')
            outputs=[]
            for index,(key,original) in enumerate(batch):
                if pieces[1+index*2]!=f'{index:06}':raise ValueError('Batch order changed')
                value=pieces[2+index*2].strip();validate(original,value);outputs.append((key,value))
            entries.update(outputs);completed+=len(batch)
        except ValueError as error:
            print(f'Checking {len(batch)} fragments separately ({type(error).__name__}).',flush=True)
            for key,original in batch:
                try:
                    value=request(original);validate(original,value);entries[key]=value;completed+=1
                except ValueError as individual:
                    failures[key]=str(individual)
                    print(f'Pending review: {key[:12]} ({type(individual).__name__}).',flush=True)
        save()
        print(f'Translated {completed}/{len(pending)}; reviewed failures {len(failures)}.',flush=True)
    failure_file=args.output.with_name(args.output.stem+'-failures.json')
    failure_file.write_text(json.dumps(failures,ensure_ascii=False,indent=2)+'\n')
    print(f'Cached {len(entries)} translations; {len(failures)} require review.',flush=True)
    if failures:raise SystemExit(1)

if __name__=='__main__':
    main()
