#!/usr/bin/env python3
"""Build the Septuagint (Greek Old Testament) for the MILTHA reader, numbered like the KJV.

Usage: python3 tools/build_lxx.py <lxx-swete checkout> <STEPBible-Data checkout>

Sources
  Text:          H. B. Swete, The Old Testament in Greek according to the Septuagint (1909-1930),
                 transcribed by the Open Greek and Latin project (First1KGreek) and corrected in
                 github.com/nathans/lxx-swete — CC BY-SA 4.0.
  Verse mapping: STEPBible TVTMS (Translators Versification Traditions with Methodology for
                 Standardisation), Tyndale House Cambridge — CC BY 4.0. Rows for the Greek tradition
                 renumber each Septuagint verse to its KJV ("Standard") number.

Output
  data/bible/lxx/<book>.json   [[verse, ...], ...] with exactly the KJV's chapters and verses;
                               "" where the Septuagint has no text for a KJV verse.
  data/bible/index.json        gains an "lxx" entry of verse counts for each book that has text.

Handling (beyond TVTMS)
  * Lettered Greek additions (e.g. 1 Kgdms 2:35a-o) stay with the verse they follow.
  * A separately numbered Psalm title goes at the start of the KJV verse 1, where the KJV prints it.
  * Swete's Proverbs 24 and 29 hold Prov 24:23-34, 30 and 31 in the Septuagint's own order; mapped here.
  * Esdras B 11-23 is Nehemiah 1-13. Daniel follows Theodotion's version, as most Greek Bibles do.
  * A verse that falls past the end of a KJV chapter is added to the chapter's last verse.
  * Ecclesiastes was never transcribed for this edition, so it is missing.
The resulting files are CC BY-SA 4.0, like the Swete transcription they come from.
"""
import collections, glob, json, os, re, sys

SW_DIR = os.path.join(sys.argv[1], 'data')
TVTMS = glob.glob(os.path.join(sys.argv[2], 'Versification', 'TVTMS*.txt'))[0]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'data', 'bible', 'lxx')
INDEX = os.path.join(ROOT, 'data', 'bible', 'index.json')

# Swete file number -> (site book id, TVTMS book code)
BOOKS = {'01': ('genesis', 'Gen'), '02': ('exodus', 'Exo'), '03': ('leviticus', 'Lev'), '04': ('numbers', 'Num'),
         '05': ('deuteronomy', 'Deu'), '06': ('joshua', 'Jos'), '08': ('judges', 'Jdg'), '10': ('ruth', 'Rut'),
         '11': ('1samuel', '1Sa'), '12': ('2samuel', '2Sa'), '13': ('1kings', '1Ki'), '14': ('2kings', '2Ki'),
         '15': ('1chronicles', '1Ch'), '16': ('2chronicles', '2Ch'), '18': ('ezra', 'Ezr'), '19': ('esther', 'Est'),
         '27': ('psalms', 'Psa'), '29': ('proverbs', 'Pro'), '31': ('song', 'Sng'), '32': ('job', 'Job'),
         '36': ('hosea', 'Hos'), '37': ('amos', 'Amo'), '38': ('micah', 'Mic'), '39': ('joel', 'Jol'),
         '40': ('obadiah', 'Oba'), '41': ('jonah', 'Jon'), '42': ('nahum', 'Nam'), '43': ('habakkuk', 'Hab'),
         '44': ('zephaniah', 'Zep'), '45': ('haggai', 'Hag'), '46': ('zechariah', 'Zec'), '47': ('malachi', 'Mal'),
         '48': ('isaiah', 'Isa'), '49': ('jeremiah', 'Jer'), '51': ('lamentations', 'Lam'), '53': ('ezekiel', 'Ezk'),
         '57': ('daniel', 'Dan')}
CODE2SITE = {code: site for site, code in BOOKS.values()}
CODE2SITE['Neh'] = 'nehemiah'

# Swete Proverbs: (chapter, first verse, last verse) -> KJV (chapter, first verse)
PROVERBS = [(24, 24, 37, 30, 1), (24, 38, 49, 24, 23), (24, 50, 68, 30, 15), (24, 69, 77, 31, 1), (29, 28, 49, 31, 10)]
EXTRA = {('Dan', 3, 98): ('Dan', 4, 1), ('Dan', 3, 99): ('Dan', 4, 2), ('Dan', 3, 100): ('Dan', 4, 3)}


def load_tvtms():
    lines = open(TVTMS, encoding='utf-8-sig').read().split('\n')
    start = next(i for i, l in enumerate(lines) if l.startswith('#DataStart(Expanded)'))
    rules = {}
    for l in lines[start + 2:]:
        c = l.split('\t')
        if len(c) < 4 or not c[0].strip() or c[0].startswith("'"):
            continue
        if 'Greek' not in [t.strip() for t in c[0].split('+')]:
            continue
        src = c[1].strip().rstrip('*')
        if '!' in src:          # subverse rows; Swete marks these with letters instead
            continue
        sm = re.match(r'^(\w+)\.(\d+):(\d+)$', src)
        tm = re.match(r'^(\w+)\.(\d+):(\d+)', c[2].strip())
        if sm and tm:
            rules.setdefault((sm.group(1), int(sm.group(2)), int(sm.group(3))),
                             (tm.group(1), int(tm.group(2)), int(tm.group(3))))
    return rules


def standard(rules, code, c, v):
    if (code, c, v) in EXTRA:
        return EXTRA[(code, c, v)], True
    if code == 'Pro':
        for ch, a, b, kc, kv in PROVERBS:
            if c == ch and a <= v <= b:
                return ('Pro', kc, kv + v - a), True
    if (code, c, v) in rules:
        return rules[(code, c, v)], True
    return (code, c, v), False


def load_swete(prefix):
    path = glob.glob(os.path.join(SW_DIR, prefix + '.*.txt'))[0]
    verses = collections.OrderedDict()
    for line in open(path, encoding='utf-8'):
        ref, _, word = line.rstrip('\n').partition(' ')
        parts = ref.split('.')
        if len(parts) == 3 and word.strip() and word.strip() != '-':
            verses.setdefault((parts[1], parts[2]), []).append(word.strip())
    return verses


def main():
    rules = load_tvtms()
    index = json.load(open(INDEX))
    placed = collections.defaultdict(lambda: collections.defaultdict(list))   # site book -> (c, v) -> texts
    stats = collections.Counter()
    for prefix, (site, code) in BOOKS.items():
        last = None
        for (cs, vs), words in load_swete(prefix).items():
            text = ' '.join(words)
            cm, vm = re.match(r'^(\d+)$', cs), re.match(r'^(\d+)([a-z]*)$', vs)
            if not cm or not vm:
                stats['skipped (not a chapter:verse)'] += 1
                continue
            c, v, letter = int(cm.group(1)), int(vm.group(1)), vm.group(2)
            bcode = code
            if code == 'Ezr' and c > 10:
                bcode, c = 'Neh', c - 10
            if letter and last:
                placed[last[0]][last[1]].append(text)
                continue
            if v == 0:
                if re.match(r'^προφήτης', text):      # a marginal heading, not text
                    continue
                v = 1                                 # an opening line: put it with verse 1
            (b, sc, sv), mapped = standard(rules, bcode, c, v)
            if v == 1 and not mapped:
                (b2, c2, v2), mapped2 = standard(rules, bcode, c, 2)
                if mapped2 and v2 == 1:               # a separately numbered Psalm title
                    b, sc, sv = b2, c2, 1
            if b not in CODE2SITE:
                stats['outside the 39 books'] += 1
                continue
            key = (CODE2SITE[b], (sc, sv))
            placed[key[0]][key[1]].append(text)
            last = key
    os.makedirs(OUT, exist_ok=True)
    for book, verses in placed.items():
        kjv = index[book]['kjv']
        chapters = [[[] for _ in range(n)] for n in kjv]
        for (c, v), texts in sorted(verses.items()):
            if c < 1 or c > len(kjv):
                stats['outside a KJV chapter'] += 1
                continue
            vi = min(max(v, 1), kjv[c - 1]) - 1           # past the chapter end -> its last verse
            if v > kjv[c - 1]:
                stats['added to a chapter-end verse'] += 1
            chapters[c - 1][vi].extend(texts)
        out = [[' '.join(t) for t in ch] for ch in chapters]
        filled = sum(1 for ch in out for t in ch if t)
        stats['KJV verses'] += sum(kjv)
        stats['KJV verses with Greek text'] += filled
        with open(os.path.join(OUT, book + '.json'), 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
        index[book]['lxx'] = kjv
    with open(INDEX, 'w') as f:
        json.dump(index, f, separators=(',', ':'))
    print(dict(stats), 'books', len(placed))


main()
