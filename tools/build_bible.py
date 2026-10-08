#!/usr/bin/env python3
"""Build per-book Bible data files for the MILTHA reader.

Usage: python3 tools/build_bible.py <dir containing KJV.json YLT.json TR.json WLC.json Peshitta.json>

Sources: github.com/scrollmapper/bible_databases (formats/json), MIT licence.
Output:  data/bible/<translation>/<book>.json  -> [[verse, verse, ...], ...] one array per chapter
         data/bible/index.json                 -> verse counts per chapter for each translation
"""
import json, os, re, sys

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'bible')

NAMES = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','I Samuel','II Samuel',
 'I Kings','II Kings','I Chronicles','II Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs',
 'Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
 'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke',
 'John','Acts','Romans','I Corinthians','II Corinthians','Galatians','Ephesians','Philippians','Colossians',
 'I Thessalonians','II Thessalonians','I Timothy','II Timothy','Titus','Philemon','Hebrews','James','I Peter',
 'II Peter','I John','II John','III John','Jude','Revelation of John']

def book_id(name):
    n = name.replace('Revelation of John', 'Revelation').replace('Song of Solomon', 'Song')
    n = re.sub(r'^III ', '3', n); n = re.sub(r'^II ', '2', n); n = re.sub(r'^I ', '1', n)
    return n.lower().replace(' ', '')

def clean(t, code):
    t = t.strip()
    if code == 'gk':
        t = re.sub(r'\d+ \S+ \d+ \{[^}]*\}', ' ', t)  # stray variant + tag (John 9:21)
        t = re.sub(r'\{[^}]*\}', ' ', t)      # stray morphology tags
        t = re.sub(r'\b\d+\b', ' ', t)        # stray Strong's numbers
    return re.sub(r'\s+', ' ', t).strip()

# code -> (source file, which books)
TRANS = {'kjv': ('KJV', NAMES), 'ylt': ('YLT', NAMES), 'heb': ('WLC', NAMES[:39]),
         'gk': ('TR', NAMES[39:]), 'ara': ('Peshitta', NAMES[39:])}

index = {}
for code, (fname, wanted) in TRANS.items():
    data = json.load(open(os.path.join(SRC, fname + '.json'), encoding='utf-8'))
    books = {b['name']: b for b in data['books']}
    os.makedirs(os.path.join(OUT, code), exist_ok=True)
    for name in wanted:
        b = books[name]
        chapters = []
        for i, c in enumerate(b['chapters']):
            assert c['chapter'] == i + 1, (code, name, i)
            verses = []
            for j, v in enumerate(c['verses']):
                assert v['verse'] == j + 1, (code, name, i, j)
                verses.append(clean(v['text'], code))
            chapters.append(verses)
        bid = book_id(name)
        with open(os.path.join(OUT, code, bid + '.json'), 'w', encoding='utf-8') as f:
            json.dump(chapters, f, ensure_ascii=False, separators=(',', ':'))
        index.setdefault(bid, {})[code] = [len(c) for c in chapters]

with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump(index, f, separators=(',', ':'))
print('books', len(index), {c: sum(sum(v[c]) for v in index.values() if c in v) for c in TRANS})
