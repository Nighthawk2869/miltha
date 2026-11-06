#!/usr/bin/env python3
"""Build the Peshitta Old Testament (Syriac) for the MILTHA reader, numbered like the KJV.

Usage: python3 tools/build_peshitta_ot.py <ETCBC/peshitta checkout>

Source: github.com/ETCBC/peshitta, plain text version 0.2 — the Leiden Peshitta Institute's edition
(Vetus Testamentum Syriace, with Codex Ambrosianus for books not yet published there), digitised by the
Eep Talstra Centre for Bible and Computer (ETCBC), VU Amsterdam. Licence: CC BY-NC 4.0 (non-commercial).

Numbering: the Peshitta follows the Hebrew Bible's chapter and verse numbers (in Psalms it leaves out
the Hebrew titles but keeps the Hebrew verse numbers). Hebrew numbers are converted to the KJV's with
the map in data/words/index.json (from STEPBible's TAHOT), so this must run after tools/build_words.py.

Output: data/bible/ara/<book>.json for the 39 Old Testament books ([[verse, ...], ...] in KJV
chapters and verses; "" where there is no text), and an "ara" entry in data/bible/index.json.
The New Testament Peshitta files in data/bible/ara are left as they are.
"""
import collections, json, os, re, sys

SRC = os.path.join(sys.argv[1], 'plain', '0.2')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
INDEX = os.path.join(ROOT, 'data', 'bible', 'index.json')
WORDS_INDEX = os.path.join(ROOT, 'data', 'words', 'index.json')
OUT = os.path.join(ROOT, 'data', 'bible', 'ara')

FILES = {'genesis': 'Genesis', 'exodus': 'Exodus', 'leviticus': 'Leviticus', 'numbers': 'Numbers',
         'deuteronomy': 'Deuteronomy', 'joshua': 'Joshua', 'judges': 'Judges', 'ruth': 'Ruth',
         '1samuel': 'Samuel_1', '2samuel': 'Samuel_2', '1kings': 'Kings_1', '2kings': 'Kings_2',
         '1chronicles': 'Chronicles_1', '2chronicles': 'Chronicles_2', 'ezra': 'Ezra', 'nehemiah': 'Nehemia',
         'esther': 'Esther', 'job': 'Job', 'psalms': 'Psalms', 'proverbs': 'Proverbs',
         'ecclesiastes': 'Ecclesiastes', 'song': 'Song_of_Songs', 'isaiah': 'Isaiah', 'jeremiah': 'Jeremiah',
         'lamentations': 'Lamentations', 'ezekiel': 'Ezekiel', 'daniel': 'Daniel', 'hosea': 'Hosea',
         'joel': 'Joel', 'amos': 'Amos', 'obadiah': 'Obadiah', 'jonah': 'Jonah', 'micah': 'Micah',
         'nahum': 'Nahum', 'habakkuk': 'Habakkuk', 'zephaniah': 'Zephaniah', 'haggai': 'Haggai',
         'zechariah': 'Zechariah', 'malachi': 'Malachi'}


def load(name):
    chapters, c, v = collections.OrderedDict(), None, None
    for line in open(os.path.join(SRC, name + '.txt'), encoding='utf-8'):
        line = line.rstrip('\n')
        m = re.match(r'^Chapter (\d+)\s*$', line)
        if m:
            c, v = int(m.group(1)), None
            chapters[c] = collections.OrderedDict()
            continue
        if not line.strip() or c is None:
            continue
        m = re.match(r'^(\d+)\s+(.*)$', line)
        if m:
            v = int(m.group(1))
            chapters[c][v] = m.group(2).strip()
        elif v is not None:
            chapters[c][v] += ' ' + line.strip()
    return chapters


def main():
    index = json.load(open(INDEX))
    words = json.load(open(WORDS_INDEX))
    stats = collections.Counter()
    for book, name in FILES.items():
        kjv = index[book]['kjv']
        heb_to_eng = {h: e for e, h in words[book].get('map', {}).items()}
        out = [[[] for _ in range(n)] for n in kjv]
        for c, verses in load(name).items():
            for v, text in verses.items():
                ec, ev = map(int, heb_to_eng.get(f'{c}:{v}', f'{c}:{v}').split(':'))
                if ec < 1 or ec > len(kjv):
                    stats['outside a KJV chapter'] += 1
                    continue
                if ev > kjv[ec - 1]:
                    stats['added to a chapter-end verse'] += 1
                out[ec - 1][min(max(ev, 1), kjv[ec - 1]) - 1].append(text)
        out = [[' '.join(t) for t in ch] for ch in out]
        stats['KJV verses'] += sum(kjv)
        stats['KJV verses with Syriac text'] += sum(1 for ch in out for t in ch if t)
        with open(os.path.join(OUT, book + '.json'), 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
        index[book]['ara'] = kjv
    with open(INDEX, 'w') as f:
        json.dump(index, f, separators=(',', ':'))
    print(dict(stats))


main()
