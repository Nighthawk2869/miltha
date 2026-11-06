#!/usr/bin/env python3
"""Build word-by-word study data for the MILTHA "Word by Word" page.

Usage: python3 tools/build_words.py <path to a checkout of github.com/STEPBible/STEPBible-Data>

Sources (Tyndale House Cambridge / STEPBible.org, CC BY 4.0):
  TAHOT  Translators Amalgamated Hebrew OT  (Leningrad Codex, following the Qere as translators do)
  TAGNT  Translators Amalgamated Greek NT   (we keep the Textus Receptus wording, to match the reader)
  TBESH / TBESG  brief Hebrew / Greek lexicons;  TEHMC / TEGMC  grammar-code explanations

Output (all JSON, UTF-8):
  data/words/<book>/<chapter>.json   {"<verse>": [word, ...]}  verses keyed in original-language numbering
      Greek word  : [text, transliteration, english, strongs, grammar, note?]
      Hebrew word : [text, transliteration, english, strongs, grammar, note?]
                    Hebrew fields keep "/" between prefix, root and suffix; the root's Strong's is in {braces}.
  data/words/index.json              {"<book>": {"lang": "heb"|"gk", "chapters": n, "map": {"eng ch:v": "orig ch:v"}}}
  data/words/grammar-heb.json, grammar-gk.json   {code: plain-English explanation}
  data/lexicon/<H|G><nn>.json        {strongs: [lemma, translit, gloss, definition-html]}  nn = number // 100

Changes made to the STEPBible data (as its licence asks us to note):
  * Greek: words not in the Textus Receptus are left out; where the TR spells or words a form differently,
    the TR form is used and the other reading is kept as a note.
  * Hebrew: words added from the Septuagint (type X) and stray manuscript variants (type V) are left out.
  * Lexicon definitions are reduced to bold, italic, line breaks and Bible references.
"""
import html, json, os, re, sys, glob
from collections import defaultdict

SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT_W = os.path.join(ROOT, 'data', 'words')
OUT_L = os.path.join(ROOT, 'data', 'lexicon')

CODES = ('Gen Exo Lev Num Deu Jos Jdg Rut 1Sa 2Sa 1Ki 2Ki 1Ch 2Ch Ezr Neh Est Job Psa Pro Ecc Sng Isa Jer Lam '
         'Ezk Dan Hos Jol Amo Oba Jon Mic Nam Hab Zep Hag Zec Mal Mat Mrk Luk Jhn Act Rom 1Co 2Co Gal Eph Php '
         'Col 1Th 2Th 1Ti 2Ti Tit Phm Heb Jas 1Pe 2Pe 1Jn 2Jn 3Jn Jud Rev').split()
IDS = ('genesis exodus leviticus numbers deuteronomy joshua judges ruth 1samuel 2samuel 1kings 2kings 1chronicles '
       '2chronicles ezra nehemiah esther job psalms proverbs ecclesiastes song isaiah jeremiah lamentations ezekiel '
       'daniel hosea joel amos obadiah jonah micah nahum habakkuk zephaniah haggai zechariah malachi matthew mark '
       'luke john acts romans 1corinthians 2corinthians galatians ephesians philippians colossians 1thessalonians '
       '2thessalonians 1timothy 2timothy titus philemon hebrews james 1peter 2peter 1john 2john 3john jude revelation').split()
BOOK = dict(zip(CODES, IDS))

# Hebrew refs may add the Hebrew numbering in (brackets); Greek refs may add the KJV/TR numbering in [square]
# brackets, which we use, or another edition's numbering in {braces}, which we ignore.
REF = re.compile(r'^([1-3A-Z][a-zA-Z0-9]{2})\.(\d+)\.(\d+)(?:\((\d+)\.(\d+)\)|\[(\d+)\.(\d+)\]|\{\d+\.\d+\})?#(\d+)=(\S+)$')

def lines(pattern):
    for f in sorted(glob.glob(os.path.join(SRC, pattern))):
        with open(f, encoding='utf-8-sig') as fh:
            for line in fh:
                cols = line.rstrip('\n').split('\t')
                m = REF.match(cols[0])
                if m:
                    yield m, cols

def split_translit(s):
    # "λόγος, (logos)" -> ("λόγος,", "logos")
    m = re.match(r'^(.*?)\s*\(([^)]*)\)\s*$', s)
    return (m.group(1), m.group(2)) if m else (s, '')

words = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))   # book -> ch -> v -> [word]
vmap = defaultdict(dict)                                                # book -> eng "c:v" -> orig "c:v"
used_strongs = set()

# ---------------- Hebrew OT ----------------
skipped_heb = defaultdict(int)
for m, c in lines('Translators Amalgamated OT+NT/TAHOT*.txt'):
    code, ec, ev, hc, hv, _, _, wn, typ = m.groups()
    if typ[0] in 'XV':                     # LXX-based additions / stray variants: not in the Hebrew text
        skipped_heb[typ] += 1; continue
    hc, hv = (hc or ec), (hv or ev)
    b = BOOK[code]
    if (ec, ev) != (hc, hv):
        vmap[b][f'{ec}:{ev}'] = f'{hc}:{hv}'
    text, translit, eng, strongs, gram = c[1], c[2], c[3], c[4], c[5]
    note = c[6].strip() if len(c) > 6 else ''
    segs = text.split('\\')                             # "\\" separates punctuation and paragraph marks
    text = segs[0] + ''.join(x for x in segs[1:] if x == '־')   # keep only a joining maqaf
    strongs = re.sub(r'\\H\d+\w?', '', strongs).rstrip('+')
    for s in re.findall(r'H\d+\w?', strongs): used_strongs.add(s)
    note = re.sub(r'\s*;\s*$', '', note)
    w = [text, translit, eng, strongs, gram]
    if note: w.append(note)
    words[b][hc][hv].append(w)

# ---------------- Greek NT (Textus Receptus wording) ----------------
VAR = re.compile(r'([^()¦;]+?)\s+\((?:[a-zA-Z]=)?([^)]*)\)\s+(.*?)\s+-\s+((?:G\d+\w*=\S+(?:\s*\+\s*)?)+?)\s+in:\s*([\w+«»]+)')

def tr_shift(eds):
    """None if the TR lacks the word, else how many places the TR moves it (TR«3 = 3 earlier)."""
    for e in eds.split('+'):
        m = re.match(r'^(?:TR|KJV)(?:([«»])(\d+))?$', e.strip())   # "KJV" marks words of the TR the KJV follows
        if m: return 0 if not m.group(1) else (-1 if m.group(1) == '«' else 1) * int(m.group(2))
    return None

pending = defaultdict(list)    # (book, ch, v) -> [(word, shift, alt ref)] ; reordered to TR order at the end
stats = defaultdict(int)
for m, c in lines('Translators Amalgamated OT+NT/TAGNT*.txt'):
    code, ch, v, _, _, kc, kv, wn, typ = m.groups()
    alt = (kc, kv) if kc else None
    b = BOOK[code]
    gk, eng, sg, eds = c[1], c[2], c[3], c[5]
    meaning_var = c[6].strip() if len(c) > 6 else ''
    spell_var = c[7].strip() if len(c) > 7 else ''
    form, translit = split_translit(gk)
    strong, gram = (sg.split('=', 1) + [''])[:2]
    note = ''
    shift = tr_shift(eds)
    if shift is None:
        # Is there a TR reading among the variants?  Use it in place of the main form.
        tr = None
        for vm in VAR.finditer(meaning_var):
            if tr_shift(vm.group(5)) is not None:
                tr = vm; shift = tr_shift(vm.group(5)); break
        if not tr:
            # Not in the TR according to STEPBible. Keep it as a candidate: it is used only if the reader's own
            # TR text has it at this point (e.g. Rev 5:11 "and the number of them was...", which the KJV has).
            used_strongs.add(strong)
            w = [form, translit, eng, strong, gram, f'Not in every printed edition of the Textus Receptus ({re.sub(r"[«»]\d+", "", eds).replace("+", ", ")})']
            pending[(b, ch, v)].append((w, 0, alt, True))
            stats['not in TR'] += 1; continue
        note = f'Other manuscripts ({re.sub(r"[«»]\d+", "", eds).replace("+", ", ")}): {form.strip(",.;·")} ({translit}) "{eng.strip(",.;:")}"'
        forms, translits = tr.group(1).split(), tr.group(2).split()
        tags = [t.split('=', 1) for t in re.split(r'\s*\+\s*', tr.group(4).strip())]
        if len(forms) != len(tags) or len(translits) != len(tags):
            stats['TR variant unparsed'] += 1; continue
        stats['TR variant used'] += 1
        for k, (f_, t_, (st, gr)) in enumerate(zip(forms, translits, tags)):
            used_strongs.add(st)
            w = [f_, t_, tr.group(3) if k == 0 else '', st, gr]
            if k == 0: w.append(note)
            pending[(b, ch, v)].append((w, shift if k == 0 else 0, alt, False))
        continue
    else:
        sm = re.search(r'(?:^|;)\s*\+?(?:[\w]+\+)*TR(?:\+[\w]+)*:\s*(\S+)', spell_var)
        if sm:
            form = sm.group(1); stats['TR spelling used'] += 1
        if meaning_var:
            note = 'Other manuscripts: ' + re.sub(r'\s*¦\s*', '; ', meaning_var)
        stats['TR'] += 1
    used_strongs.add(strong)
    w = [form, translit, eng, strong, gram]
    if note: w.append(note)
    pending[(b, ch, v)].append((w, shift, alt, False))

# Put each verse into TR word order.
nt_chapters = defaultdict(list)          # (book, ch) -> [(word, main verse, alt ref)] in TR order
for (b, ch, v), items in pending.items():
    order = list(items)
    for it in items:
        sh = it[1]
        if sh:
            i = next(k for k, x in enumerate(order) if x is it); order.pop(i)
            # TR«n: the TR has this word n places earlier (just after the word n back); TR»n: n places later
            order.insert(max(0, min(len(order), i + sh + (1 if sh < 0 else 0))), it)
    nt_chapters[(b, ch)].extend((w, v, alt, cand) for w, _, alt, cand in order)

# Verse divisions differ between editions (e.g. 2 Cor 8:13-14, 2 Cor 13:12-14, Php 1:16-17, Rev 12:18).
# Assign each Greek word to the verse of the reader's own TR text by aligning the two texts chapter by chapter;
# words the alignment cannot place keep the TAGNT's KJV-style numbering.
import difflib, unicodedata
def tok(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lower().replace('ς', 'σ')
    return re.sub(r'[^\u03b1-\u03c9]', '', s)[:4]
for (b, ch), items in sorted(nt_chapters.items(), key=lambda kv: (kv[0][0], int(kv[0][1]))):
    site = json.load(open(os.path.join(ROOT, 'data', 'bible', 'gk', b + '.json'), encoding='utf-8'))
    ci = int(ch) - 1
    site_toks, site_vs = [], []
    if ci < len(site):
        for vi, text in enumerate(site[ci], 1):
            for t in text.split():
                site_toks.append(tok(t)); site_vs.append(vi)
    mine = [tok(w[0]) for w, _, _, _ in items]
    placed = [None] * len(items)
    for blk in difflib.SequenceMatcher(None, site_toks, mine, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            placed[blk.b + k] = (ch, str(site_vs[blk.a + k]))
    for k, (w, v, alt, cand) in enumerate(items):
        if cand:
            if placed[k] is None: continue
            stats['candidate kept'] += 1
        c2, v2 = placed[k] or (alt or (ch, v))
        if placed[k] is None: stats['placed by numbering'] += 1
        words[b][c2][v2].append(w)
print('greek', dict(stats)); print('hebrew skipped', dict(skipped_heb))

# ---------------- write word files ----------------
index = {}
for b in IDS:
    chs = words[b]
    os.makedirs(os.path.join(OUT_W, b), exist_ok=True)
    for ch, vs in chs.items():
        with open(os.path.join(OUT_W, b, f'{ch}.json'), 'w', encoding='utf-8') as f:
            json.dump({k: vs[k] for k in sorted(vs, key=int)}, f, ensure_ascii=False, separators=(',', ':'))
    index[b] = {'lang': 'heb' if IDS.index(b) < 39 else 'gk', 'chapters': max(map(int, chs))}
    if vmap[b]: index[b]['map'] = vmap[b]
with open(os.path.join(OUT_W, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump(index, f, separators=(',', ':'))

# ---------------- grammar explanations ----------------
def tidy_gram(s):
    # "Function=Verb ; Stem=Qal (hence Action=Simple; Voice=Active); ..." -> "Verb · Qal (simple, active) · ..."
    s = re.sub(r'\(hence ([^)]*)\)', lambda m: '(' + re.sub(r'\w+=', '', m.group(1)).replace(';', ',').lower() + ')', s)
    s = re.sub(r'\b\w+=', '', s)
    parts = [re.sub(r'\s+', ' ', p).strip() for p in s.split(';')]
    parts = [{'Third': '3rd person', 'Second': '2nd person', 'First': '1st person', '3rd': '3rd person',
              '2nd': '2nd person', '1st': '1st person'}.get(p, p) for p in parts]
    return ' · '.join(p for p in parts if p)
for lang, pat in (('heb', 'TEHMC*'), ('gk', 'TEGMC*')):
    table = {}
    for f in glob.glob(os.path.join(SRC, 'Morphology codes', pat + '.txt')):
        for line in open(f, encoding='utf-8-sig'):
            cols = line.rstrip('\n').split('\t')
            if len(cols) > 1 and re.match(r'^[A-Z][\w-]*$', cols[0]) and 'Function=' in cols[1]:
                table.setdefault(cols[0], tidy_gram(cols[1]))
    with open(os.path.join(OUT_W, f'grammar-{lang}.json'), 'w', encoding='utf-8') as f:
        json.dump(table, f, ensure_ascii=False, separators=(',', ':'))
    print('grammar', lang, len(table))

# ---------------- lexicon ----------------
def clean_def(d):
    d = re.sub(r"<ref='([^']*)'>(.*?)</ref>", lambda m: '\x01' + m.group(1) + '\x02' + m.group(2) + '\x03', d)
    d = re.sub(r'(?i)<br\s*/?>', '\x04', d)
    d = re.sub(r'<(/?)(b|i)>', lambda m: '\x05' + m.group(1) + m.group(2) + '\x06', d)
    d = re.sub(r'<[^>]*>', '', d)                      # drop every other tag
    d = html.escape(html.unescape(d), quote=False)
    d = re.sub('\x01([^\x02]*)\x02([^\x03]*)\x03',
               lambda m: '<a data-ref="%s">%s</a>' % (html.escape(m.group(1), quote=True), m.group(2)), d)
    d = d.replace('\x04', '<br>')
    d = re.sub('\x05(/?)(b|i)\x06', r'<\1\2>', d)
    d = re.sub(r'(^|<br>)\s*_+', r'\1', d)              # "__1." outline markers -> "1."
    d = re.sub(r'(<br>\s*){3,}', '<br><br>', d).strip()
    return re.sub(r'^(<br>\s*)+|(<br>\s*)+$', '', d)

lex = {}
for f in glob.glob(os.path.join(SRC, 'Lexicons', 'TBES[GH]*.txt')):
    for line in open(f, encoding='utf-8-sig'):
        cols = line.rstrip('\n').split('\t')
        if len(cols) < 8 or not re.match(r'^[GH]\d', cols[0]): continue
        key = cols[1].split(' ')[0].strip()
        if key in lex: continue
        lex[key] = [cols[3], cols[4], cols[6], clean_def(cols[7])]

by_base = defaultdict(list)
for k in lex: by_base[re.match(r'[GH]\d+', k).group()].append(k)

def resolve(s):
    base = re.match(r'[GH]\d+', s).group()
    for k in (s, s.upper(), base, base + 'G', base + 'A'):
        if k in lex: return k
    if by_base[base]: return sorted(by_base[base])[0]

missing = sorted(s for s in used_strongs if not resolve(s))
print('strongs used', len(used_strongs), 'missing', len(missing), missing[:20])
chunks = defaultdict(dict)
for s in used_strongs:
    k = resolve(s)
    if not k: continue
    entry = lex[k]
    chunks[s[0] + str(int(re.search(r'\d+', s).group()) // 100)][s] = entry
os.makedirs(OUT_L, exist_ok=True)
for name, entries in chunks.items():
    with open(os.path.join(OUT_L, name + '.json'), 'w', encoding='utf-8') as f:
        json.dump(dict(sorted(entries.items())), f, ensure_ascii=False, separators=(',', ':'))
print('lexicon files', len(chunks))
