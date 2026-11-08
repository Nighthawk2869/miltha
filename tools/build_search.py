#!/usr/bin/env python3
"""Build the Knowledge Engine's search file from the Library.

Usage: python3 tools/build_search.py   (after tools/build_library.py)

Writes data/search/fathers.json: [[work id, chapter no., paragraph no., text], ...] with long paragraphs
split at sentence ends into pieces of about 1,200 characters, so each search hit is a quotable passage.
Also writes data/search/bible.json: [[book id, chapter, verse, KJV text], ...] for every verse, in canonical order,
so the Knowledge Engine can find Scripture by topic as well as by reference.
netlify/functions/ask.mjs loads these files once per server instance and searches them for each question;
netlify/functions/search.mjs (the Bible search page) searches data/search/bible.json too.

Also writes data/search/strongs/<H|G><n>.json (n = Strong's number // 100): for every Hebrew and Greek dictionary
word, the verses (KJV numbering) where it occurs and the forms it takes there, from data/words (Hebrew Old
Testament, Greek New Testament) and data/words-lxx (Septuagint). Used by search.html?strong=G0026.
Run after tools/build_words.py and tools/build_lxx_words.py.
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LIB = os.path.join(ROOT, 'data', 'library')
OUT = os.path.join(ROOT, 'data', 'search')
MAX = 1200

def pieces(text):
    if len(text) <= MAX * 1.4:
        return [text]
    sentences = re.split(r'(?<=[.!?;:])\s+(?=[“"‘A-Z\[(])', text)
    out, cur = [], ''
    for s in sentences:
        if cur and len(cur) + len(s) > MAX:
            out.append(cur); cur = s
        else:
            cur = (cur + ' ' + s).strip()
    if cur:
        out.append(cur)
    return out

rows = []
index = json.load(open(os.path.join(LIB, 'index.json'), encoding='utf-8'))
for author in index:
    for w in author['works']:
        doc = json.load(open(os.path.join(LIB, w['id'] + '.json'), encoding='utf-8'))
        for ci, c in enumerate(doc['chapters'], 1):
            for pi, p in enumerate(c['p'], 1):
                for piece in pieces(p):
                    rows.append([w['id'], ci, pi, piece])
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'fathers.json'), 'w', encoding='utf-8') as f:
    json.dump(rows, f, ensure_ascii=False, separators=(',', ':'))
print(len(rows), 'passages')

verses = []
bible_index = json.load(open(os.path.join(ROOT, 'data', 'bible', 'index.json'), encoding='utf-8'))
for book in bible_index:
    path = os.path.join(ROOT, 'data', 'bible', 'kjv', book + '.json')
    if not os.path.exists(path):
        continue
    for ci, ch in enumerate(json.load(open(path, encoding='utf-8')), 1):
        for vi, text in enumerate(ch, 1):
            if text:
                verses.append([book, ci, vi, text])
with open(os.path.join(OUT, 'bible.json'), 'w', encoding='utf-8') as f:
    json.dump(verses, f, ensure_ascii=False, separators=(',', ':'))
print(len(verses), 'verses')


# ---------- every verse with a given Hebrew or Greek word ----------
import collections, glob, re, unicodedata
words_index = json.load(open(os.path.join(ROOT, 'data', 'words', 'index.json'), encoding='utf-8'))
books = list(bible_index)
MAX_REFS = 4000          # the article, "and" and the like occur tens of thousands of times; keep the first 4,000
occ = collections.defaultdict(lambda: {'f': [], 'r': []})
seen = set()


def add(key, b, c, v, form, src):
    key = key.strip()
    if not re.match(r'^[HG]\d{4}[A-Z]?$', key):
        return
    e = occ[key]
    if (key, b, c, v, src) in seen:
        return
    seen.add((key, b, c, v, src))
    form = unicodedata.normalize('NFC', re.sub('[\u0591-\u05AF\u05BD\u05C0\u05C3]', '', form))  # one spelling, no chant marks
    if sum(1 for r in e['r'] if r[4] == src) >= MAX_REFS:
        e['more'] = e.get('more', 0) + 1
        return
    if form not in e['f']:
        e['f'].append(form)
    e['r'].append([b, c, v, e['f'].index(form), src])


clean = lambda w: re.sub(r'[\s.,;:·\u0387\u037e?!"“”‘’()\[\]¶׃־׀]+$', '', re.sub(r'^[\s"“‘(\[]+', '', w))
for bi, book in enumerate(books):
    wdir = os.path.join(ROOT, 'data', 'words', book)
    if os.path.isdir(wdir):
        info = words_index.get(book, {})
        heb_to_kjv = {h: e for e, h in info.get('map', {}).items()} if isinstance(info, dict) else {}
        for f in sorted(glob.glob(os.path.join(wdir, '*.json')), key=lambda x: int(os.path.basename(x)[:-5])):
            ch = int(os.path.basename(f)[:-5])
            for v, ws in json.load(open(f, encoding='utf-8')).items():
                kc, kv = map(int, heb_to_kjv.get(f'{ch}:{v}', f'{ch}:{v}').split(':'))
                kv = max(kv, 1)                    # psalm titles belong with verse 1 in the KJV
                for w in ws:
                    # Hebrew: the main word's number is in braces ({H1254A}); the rest are prefixes and suffixes
                    main = re.findall(r'\{([HG]\d{4}[A-Z]?)\}', w[3]) or ([w[3].split('/')[0]] if w[3].startswith('G') else [])
                    for key in main:
                        add(key, bi, kc, kv, clean(w[0]).replace('/', ''), 0)
    ldir = os.path.join(ROOT, 'data', 'words-lxx', book)
    if os.path.isdir(ldir):
        lemmas = json.load(open(os.path.join(ROOT, 'data', 'words-lxx', 'lemmas.json'), encoding='utf-8'))
        for f in glob.glob(os.path.join(ldir, '*.json')):
            ch = int(os.path.basename(f)[:-5])
            for v, ws in json.load(open(f, encoding='utf-8')).items():
                for w in ws:
                    key = lemmas[w[1]][1]
                    if key:
                        add(key, bi, ch, int(v), clean(w[0]), 1)

sdir = os.path.join(OUT, 'strongs')
os.makedirs(sdir, exist_ok=True)
for f in glob.glob(os.path.join(sdir, '*.json')):
    os.remove(f)
buckets = collections.defaultdict(dict)
for key, e in occ.items():
    e['r'].sort(key=lambda r: (r[4], r[0], r[1], r[2]))
    buckets[key[0] + str(int(key[1:5]) // 100)][key] = e
for name, data in buckets.items():
    with open(os.path.join(sdir, name + '.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
with open(os.path.join(sdir, 'books.json'), 'w', encoding='utf-8') as f:
    json.dump(books, f, separators=(',', ':'))
print(len(occ), 'Hebrew and Greek words indexed in', len(buckets), 'files')
