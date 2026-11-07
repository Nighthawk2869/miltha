#!/usr/bin/env python3
"""Build Word by Word for the Septuagint (Greek Old Testament), numbered like the KJV.

Usage: python3 tools/build_lxx_words.py <QuantForgeSoftware/lxx checkout> <STEPBible-Data checkout>
       (run after tools/build_words.py, which writes the New Testament words and data/lexicon)

Sources
  Words, grammar, dictionary forms: github.com/QuantForgeSoftware/lxx — Swete's Septuagint (First1KGreek
      transcription) analysed by the Morpheus parser. CC BY-SA 4.0. Machine-tagged: Morpheus gets some
      common words wrong (παρά read as πηρός "maimed", οὐδέ as οὐδός "threshold", ἵνα, εἶπον…).
  Corrections: the site's own New Testament words (data/words, from STEPBible's hand-checked TAGNT).
      When a Septuagint word form also occurs in the New Testament and is (nearly) always the same word
      there, that dictionary entry and grammar are used instead of the machine's.
  Meanings: STEPBible TBESG (Abbott-Smith based, extended Strong's, incl. Septuagint-only words) and
      TFLSJ (LSJ) for finding dictionary forms — CC BY 4.0.
  Verse numbers: STEPBible TVTMS, the same rules as tools/build_lxx.py.

Output (CC BY-SA 4.0, like the Swete text and the Morpheus analysis)
  data/words-lxx/<book>/<ch>.json  {"<KJV verse>": [[word, lemma index, grammar code], ...]}
  data/words-lxx/lemmas.json       [[dictionary form, Strong's or "", English gloss], ...]
  data/words-lxx/grammar.json      {grammar code: readable description} for codes not in grammar-gk.json
  data/lexicon/*.json              gains the dictionary entries Septuagint words need
"""
import collections, glob, html, json, os, re, sys, unicodedata

QF = os.path.join(sys.argv[1], 'data')
STEP = sys.argv[2]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'data', 'words-lxx')
LEX_DIR = os.path.join(ROOT, 'data', 'lexicon')
INDEX = os.path.join(ROOT, 'data', 'bible', 'index.json')
TVTMS = glob.glob(os.path.join(STEP, 'Versification', 'TVTMS*.txt'))[0]

# TLG work number (QuantForge books.tsv) -> (site book id, TVTMS code); Daniel = Theodotion, as in the reader
TLG = {'001': ('genesis', 'Gen'), '002': ('exodus', 'Exo'), '003': ('leviticus', 'Lev'), '004': ('numbers', 'Num'),
       '005': ('deuteronomy', 'Deu'), '006': ('joshua', 'Jos'), '008': ('judges', 'Jdg'), '010': ('ruth', 'Rut'),
       '011': ('1samuel', '1Sa'), '012': ('2samuel', '2Sa'), '013': ('1kings', '1Ki'), '014': ('2kings', '2Ki'),
       '015': ('1chronicles', '1Ch'), '016': ('2chronicles', '2Ch'), '018': ('ezra', 'Ezr'), '019': ('esther', 'Est'),
       '027': ('psalms', 'Psa'), '029': ('proverbs', 'Pro'), '031': ('song', 'Sng'), '032': ('job', 'Job'),
       '036': ('hosea', 'Hos'), '037': ('amos', 'Amo'), '038': ('micah', 'Mic'), '039': ('joel', 'Jol'),
       '040': ('obadiah', 'Oba'), '041': ('jonah', 'Jon'), '042': ('nahum', 'Nam'), '043': ('habakkuk', 'Hab'),
       '044': ('zephaniah', 'Zep'), '045': ('haggai', 'Hag'), '046': ('zechariah', 'Zec'), '047': ('malachi', 'Mal'),
       '048': ('isaiah', 'Isa'), '049': ('jeremiah', 'Jer'), '051': ('lamentations', 'Lam'), '053': ('ezekiel', 'Ezk'),
       '057': ('daniel', 'Dan')}
CODE2SITE = {code: site for site, code in TLG.values()}
CODE2SITE['Neh'] = 'nehemiah'
PROVERBS = [(24, 24, 37, 30, 1), (24, 38, 49, 24, 23), (24, 50, 68, 30, 15), (24, 69, 77, 31, 1), (29, 28, 49, 31, 10)]
EXTRA = {('Dan', 3, 98): ('Dan', 4, 1), ('Dan', 3, 99): ('Dan', 4, 2), ('Dan', 3, 100): ('Dan', 4, 3)}

# Morpheus dictionary forms that are elisions, other spellings, or mistakes -> the usual dictionary form
ALIASES = {
    'ἐπ': 'ἐπί', 'ἐφ': 'ἐπί', 'μετ': 'μετά', 'μεθ': 'μετά', 'ἀπ': 'ἀπό', 'ἀφ': 'ἀπό', 'δι': 'διά', 'δι᾿': 'διά',
    'ἀλλ': 'ἀλλά', 'κατ': 'κατά', 'καθ': 'κατά', 'παρ': 'παρά', 'ὑπ': 'ὑπό', 'ὑφ': 'ὑπό', 'ἀντ': 'ἀντί', 'ἀνθ': 'ἀντί',
    'πηρός': 'παρά', 'οὐδός': 'οὐδέ', 'ἴνη': 'ἵνα', 'εἶπος': 'λέγω', 'μείς': 'μήν', 'φάος': 'φῶς', 'Ἰδούς': 'ἰδού',
    'κοί': 'καί', 'τῆ': 'τῇ', 'σαυτοῦ': 'σεαυτοῦ', 'γιγνώσκω': 'γινώσκω', 'γίγνομαι': 'γίνομαι',
    'παραγίγνομαι': 'παραγίνομαι', 'ἐπιγιγνώσκω': 'ἐπιγινώσκω', 'ἀναγιγνώσκω': 'ἀναγινώσκω', 'ἀνοίγνυμι': 'ἀνοίγω',
    'ἐμπίπλημι': 'ἐμπίμπλημι', 'Λευείτης': 'Λευίτης', 'σωτήριος': 'σωτήριον', 'ἀφεστήξω': 'ἀφίστημι',
    'Δαυίδησ-πλ': 'Δαυίδ', 'Βορέασ-πλ': 'βορρᾶς', 'εἶδον': 'ὁράω',
}

POS = {'A-': 'Adjective', 'C-': 'Conjunction', 'D-': 'Adverb', 'I-': 'Interjection', 'N-': 'Noun', 'NP': 'Name',
       'P-': 'Preposition', 'RA': 'Article', 'RD': 'Demonstrative pronoun', 'RI': 'Interrogative / indefinite pronoun',
       'RP': 'Personal pronoun', 'RR': 'Relative pronoun', 'V-': 'Verb', 'X-': 'Particle'}
PARSE = [  # position -> {letter: word}
    {'1': '1st person', '2': '2nd person', '3': '3rd person'},
    {'P': 'Present', 'I': 'Imperfect', 'F': 'Future', 'A': 'Aorist', 'X': 'Perfect', 'Y': 'Pluperfect'},
    {'A': 'Active', 'M': 'Middle', 'P': 'Passive'},
    {'I': 'Indicative', 'D': 'Imperative', 'S': 'Subjunctive', 'O': 'Optative', 'N': 'Infinitive', 'P': 'Participle'},
    {'N': 'Nominative', 'G': 'Genitive', 'D': 'Dative', 'A': 'Accusative', 'V': 'Vocative'},
    {'S': 'Singular', 'P': 'Plural', 'D': 'Dual'},
    {'M': 'Masculine', 'F': 'Feminine', 'N': 'Neuter'},
    {'C': 'Comparative', 'S': 'Superlative'}]
ORDER = [0, 1, 2, 3, 4, 5, 6, 7]


def describe(pos, parse):
    if pos == '?':
        return 'Not available for this word (damaged or capitalised in the transcription)'
    words = [POS.get(pos, pos)]
    # verbs read tense · voice · mood · person · number; others case · number · gender
    order = [1, 2, 3, 0, 4, 5, 6, 7] if pos == 'V-' else ORDER
    for i in order:
        ch = parse[i] if i < len(parse) else '-'
        if ch != '-' and ch in PARSE[i]:
            words.append(PARSE[i][ch])
    return ' · '.join(words)


def nfc(s):
    return unicodedata.normalize('NFC', s).strip()


def strip_marks(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower().replace('ς', 'σ')


def form_key(s):
    """A word as it would be looked up: no punctuation, lower case, grave accent written as acute."""
    s = re.sub(r"[\s.,;:··?!\"“”‘’'ʼ᾿῾()\[\]⸀⸁⸂⸃¶—–-]+", '', s)
    d = unicodedata.normalize('NFD', s.lower()).replace('̀', '́')
    return unicodedata.normalize('NFC', d)


# ---------- dictionaries ----------
def clean_def(d):   # same as tools/build_words.py
    d = re.sub(r"<ref='([^']*)'>(.*?)</ref>", lambda m: '\x01' + m.group(1) + '\x02' + m.group(2) + '\x03', d)
    d = re.sub(r'(?i)<br\s*/?>', '\x04', d)
    d = re.sub(r'<(/?)(b|i)>', lambda m: '\x05' + m.group(1) + m.group(2) + '\x06', d)
    d = re.sub(r'<[^>]*>', '', d)
    d = html.escape(html.unescape(d), quote=False)
    d = re.sub('\x01([^\x02]*)\x02([^\x03]*)\x03',
               lambda m: '<a data-ref="%s">%s</a>' % (html.escape(m.group(1), quote=True), m.group(2)), d)
    d = d.replace('\x04', '<br>')
    d = re.sub('\x05(/?)(b|i)\x06', r'<\1\2>', d)
    d = re.sub(r'(^|<br>)\s*_+', r'\1', d)
    d = re.sub(r'(<br>\s*){3,}', '<br><br>', d).strip()
    return re.sub(r'^(<br>\s*)+|(<br>\s*)+$', '', d)


entries = {}          # Strong's key -> [lemma, translit, gloss, definition html]
form_of = {}          # Strong's key -> the Strong's key of the word it is a form of (μέ -> ἐγώ)
by_lemma, by_bare = {}, {}
for name in ['TBESG', 'TFLSJ  0', 'TFLSJ extra']:
    for f in glob.glob(os.path.join(STEP, 'Lexicons', name + '*.txt')):
        brief = name == 'TBESG'
        for line in open(f, encoding='utf-8-sig'):
            c = line.rstrip('\n').split('\t')
            if len(c) < 8 or not re.match(r'^G\d{4}', c[0]):
                continue
            key = c[1].split(' ')[0].strip() if brief else c[2].strip()
            if not re.match(r'^G\d{4}[A-Z]?$', key):
                continue
            if brief and 'Form of' in c[1] and re.match(r'^G\d{4}[A-Z]?$', c[2].strip()):
                form_of.setdefault(key, c[2].strip())
            if key not in entries:
                # LSJ entries are long; keep their gloss and only the first part of the definition
                entries[key] = [c[3].split(',')[0].strip(), c[4], c[6], clean_def(c[7]) if brief else clean_def(c[7])[:1500]]
            for lem in re.split(r',\s*', c[3]):
                lem = nfc(lem)
                if lem:
                    by_lemma.setdefault(lem, key)
                    by_bare.setdefault(strip_marks(lem), key)

# ---------- New Testament forms (hand-checked, STEPBible TAGNT via data/words) ----------
index = json.load(open(INDEX))
GK = json.load(open(os.path.join(ROOT, 'data', 'words', 'grammar-gk.json'), encoding='utf-8'))
nt_books = [b for b in index if os.path.isdir(os.path.join(ROOT, 'data', 'words', b)) and b in (
    'matthew mark luke john acts romans 1corinthians 2corinthians galatians ephesians philippians colossians '
    '1thessalonians 2thessalonians 1timothy 2timothy titus philemon hebrews james 1peter 2peter 1john 2john '
    '3john jude revelation').split()]
nt = collections.defaultdict(collections.Counter)
nt_gloss = collections.defaultdict(collections.Counter)   # (form, strong) -> English in context
for b in nt_books:
    for f in glob.glob(os.path.join(ROOT, 'data', 'words', b, '*.json')):
        for words in json.load(open(f)).values():
            for w in words:
                st = re.match(r'G\d{4}[A-Z]?', w[3])
                if st:
                    nt[form_key(w[0])][(st.group(), w[4])] += 1
                    g = re.sub(r'[,.;:·!?]+$', '', w[2]).strip()
                    if g:
                        nt_gloss[(form_key(w[0]), st.group())][g] += 1


def no_breathing(s):
    return unicodedata.normalize('NFC', unicodedata.normalize('NFD', s).replace('\u0313', '').replace('\u0314', ''))


# second and third tries: the same word without breathing marks (the transcription misprints some),
# and, for words printed in unaccented capitals, without any marks at all
nt_nb, nt_bare = collections.defaultdict(collections.Counter), collections.defaultdict(collections.Counter)
for f, c in list(nt.items()):
    nt_nb[no_breathing(f)].update(c)
    nt_bare[strip_marks(f)].update(c)


def nt_choice(form):
    for table, key in ((nt, form), (nt_nb, no_breathing(form))):
        r = pick(table.get(key))
        if r:
            return r + (key,)
    if not re.search('[\u0300-\u036f\u0342-\u0345]', unicodedata.normalize('NFD', form)):
        r = pick(nt_bare.get(strip_marks(form)))
        if r:
            return r + (None,)
    return None


CNG = re.compile(r'-([NGDAV])([SP])([MFN])')


def cng(code):
    """case, number, gender of a grammar code ('N-ASF', or Morpheus 'M:N-:----ASF-')"""
    if code.startswith('M:'):
        p = code.split(':')[2]
        return p[4:7] if len(p) >= 7 and '-' not in p[4:7] else None
    m = CNG.search(code)
    return ''.join(m.groups()) if m else None


def recase(code, art):
    if code.startswith('M:'):
        _, pos, p = code.split(':')
        return 'M:' + pos + ':' + p[:4] + art[0] + art[1] + p[6:]
    return CNG.sub('-' + art, code, count=1)


PREPOSITIONS = {'ἐπί', 'μετά', 'ἀπό', 'διά', 'κατά', 'παρά', 'ὑπό', 'ἀντί'}
CONJUNCTIONS = {'ἀλλά'}


def pick(c):
    """The New Testament's word for a spelling, if (nearly) always the same dictionary word there.
    Sub-entries of one word (G3754G "that", G3754H "because") count together."""
    if not c:
        return None
    by_base, by_strong = collections.Counter(), collections.Counter()
    for (s, g), n in c.items():
        by_base[s[:5]] += n
        by_strong[s] += n
    total = sum(by_base.values())
    base, n = by_base.most_common(1)[0]
    if total >= 2 and n / total >= 0.9:
        s = max((x for x in by_strong if x[:5] == base), key=lambda x: by_strong[x])
        codes = collections.Counter()
        for (ss, g), k in c.items():
            if ss[:5] == base:
                codes[g] += k
        m = sum(codes.values())
        # every reading this spelling has in the New Testament (5%+), commonest first
        return s, [g for g, k in codes.most_common() if k / m >= 0.05]
    return None
    by_strong = collections.Counter()
    for (s, g), n in c.items():
        by_strong[s] += n
    total = sum(by_strong.values())
    s, n = by_strong.most_common(1)[0]
    if total >= 2 and n / total >= 0.9:
        codes = collections.Counter({g: k for (ss, g), k in c.items() if ss == s})
        m = sum(codes.values())
        # every reading this spelling has in the New Testament (5%+), commonest first
        return s, [g for g, k in codes.most_common() if k / m >= 0.05]
    return None


def strongs_for(lemma):
    lemma = ALIASES.get(lemma, lemma)
    return by_lemma.get(nfc(lemma)) or by_bare.get(strip_marks(lemma)), lemma


# ---------- verse mapping (as tools/build_lxx.py) ----------
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
        if '!' in src:
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


def main():
    rules = load_tvtms()
    books = {}
    for line in open(os.path.join(QF, 'books.tsv'), encoding='utf-8'):
        c = line.rstrip('\n').split('\t')
        if c[0].isdigit():
            books[int(c[0])] = c[3].replace('tlg', '')
    lemmas, lemma_ix, grammar = [], {}, {}
    used_strongs = set()
    placed = collections.defaultdict(lambda: collections.defaultdict(list))
    stats = collections.Counter()

    for path in sorted(glob.glob(os.path.join(QF, 'morph-morpheus', '*.txt'))):
        tlg = books[int(os.path.basename(path).split('-')[0])]
        if tlg not in TLG:
            continue
        site, code = TLG[tlg]
        for line in open(path, encoding='utf-8'):
            col = line.rstrip('\n').split(' ')
            if len(col) < 9:
                continue
            ref, pos, parse, word, lemma, source = col[0], col[1], col[2], col[4], col[6], col[8]
            c, v = int(ref[3:6]), int(ref[6:9])
            bcode = code
            if code == 'Ezr' and c > 10:
                bcode, c = 'Neh', c - 10
            if v == 0:
                v = 1
            (b, sc, sv), mapped = standard(rules, bcode, c, v)
            if v == 1 and not mapped:
                (b2, c2, v2), mapped2 = standard(rules, bcode, c, 2)
                if mapped2 and v2 == 1:
                    b, sc, sv = b2, c2, 1
            if b not in CODE2SITE:
                stats['outside the 39 books'] += 1
                continue

            stats['words'] += 1
            choice = nt_choice(form_key(word))
            strong, gram = None, None
            mlemma = ALIASES.get(lemma, lemma)
            mstrong, _ = strongs_for(lemma)
            if choice and source != 'morpheus-proper' and choice[0] != mstrong:
                stats['corrected from the New Testament'] += 1
            cands = None
            if choice:
                strong, cands, fkey = choice
                # the New Testament marks words used as titles of God ("-T"); not carried over
                cands = list(dict.fromkeys(g[:-2] if g.endswith('-T') and g[:-2] in GK else g for g in cands))
                gram = cands[0]
                stats['checked against the New Testament'] += 1
            else:
                fkey = None
                strong = mstrong
                if source == 'morpheus-proper' and mlemma in PREPOSITIONS | CONJUNCTIONS:
                    pos, parse = ('P-' if mlemma in PREPOSITIONS else 'C-'), '--------'
                elif source == 'morpheus-proper' and strong and mlemma[:1].islower():
                    pos, parse = '?', '--------'      # a damaged or capitalised word: no reliable grammar
                # "-ει" is both 3rd singular active and 2nd singular middle; for an active verb (dictionary
                # form in -ω) the 3rd person active reading is far commoner in the Septuagint
                if (pos == 'V-' and parse[0] == '2' and parse[2] in 'MP' and parse[3] == 'I' and parse[5] == 'S'
                        and parse[1] in 'PF' and strip_marks(word).endswith('ει') and strip_marks(mlemma).endswith('ω')):
                    parse = '3' + parse[1] + 'A' + parse[3:]
                    stats['-ει read as 3rd person active'] += 1
                gram = 'M:' + pos + ':' + parse
            if strong:
                used_strongs.add(strong)
                stats['with a meaning'] += 1
                e = entries.get(strong)
                base = entries.get(form_of.get(strong, strong)) or e
                gloss = e[2] if e else ''
                # pronouns: the New Testament's English in context ("of us"), which the dictionary gives only
                # as "I/we"; other words keep the plain dictionary meaning (the New Testament's capitals,
                # e.g. "Father" or "Him" for God, would mislead in the Old Testament)
                if fkey and nt_gloss.get((fkey, strong)) and re.match(r'^[PRCDKIXQSF]-', cands[0]):
                    g = nt_gloss[(fkey, strong)].most_common(1)[0][0]
                    g = re.sub(r'[<>\[\]]', '', g)
                    g = re.sub(r"\b(Him|He|His|Himself|Me|My|Mine|Myself|You|Your|Yours|Yourself|Whom|Who|Whose)\b",
                               lambda m: m.group(1).lower(), g)    # the New Testament capitalises these for God
                    gloss = g if g.split(' ')[0] == 'I' else g[:1].lower() + g[1:]
                key = ('S', strong, gloss)
                item = [base[0] if base else mlemma, strong, gloss]
            else:
                key = ('L', nfc(mlemma))
                is_name = (source == 'morpheus-proper' or pos == 'NP') and mlemma[:1].isupper()
                item = [nfc(mlemma), '', 'name' if is_name else '']
                stats['no meaning found'] += 1
            if key not in lemma_ix:
                lemma_ix[key] = len(lemmas)
                lemmas.append(item)
            placed[CODE2SITE[b]][(sc, sv)].append([word, lemma_ix[key], gram, cands])

    # a spelling with several readings (ἀνομίας: genitive singular or accusative plural): take the one
    # that agrees with the article just before it
    for verses in placed.values():
        for words in verses.values():
            for i, w in enumerate(words):
                cands = w.pop()
                if cands and len(cands) > 1 and i and lemmas[words[i - 1][1]][1] == 'G3588':
                    want = cng(words[i - 1][2])
                    match = [g for g in cands if want and cng(g) == want]
                    if match and match[0] != w[2]:
                        w[2] = match[0]
                        stats['reading chosen by the article'] += 1
                # a noun or adjective right after an article takes the article's case and number when the
                # gender agrees (τὰς ἀνομίας is accusative plural, not genitive singular)
                if i and lemmas[words[i - 1][1]][1] == 'G3588':
                    art, mine = cng(words[i - 1][2]), cng(w[2])
                    if art and mine and art != mine and art[2] == mine[2] and re.match(r'^(M:)?[NA]-', w[2]):
                        w[2] = recase(w[2], art)
                        stats['case and number taken from the article'] += 1
            for w in words:
                if w[2].startswith('M:'):
                    _, pos, parse = w[2].split(':')
                    grammar.setdefault(w[2], describe(pos, parse))

    # write chapters, KJV-numbered, words past a chapter's end go with its last verse
    for book, verses in placed.items():
        kjv = index[book]['kjv']
        chapters = collections.defaultdict(dict)
        for (c, v), words in sorted(verses.items()):
            if c < 1 or c > len(kjv):
                stats['outside a KJV chapter'] += 1
                continue
            vi = min(max(v, 1), kjv[c - 1])
            chapters[c].setdefault(str(vi), []).extend(words)
        os.makedirs(os.path.join(OUT, book), exist_ok=True)
        for c, data in chapters.items():
            with open(os.path.join(OUT, book, f'{c}.json'), 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(OUT, 'lemmas.json'), 'w', encoding='utf-8') as f:
        json.dump(lemmas, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(OUT, 'grammar.json'), 'w', encoding='utf-8') as f:
        json.dump(grammar, f, ensure_ascii=False, separators=(',', ':'))

    # add the dictionary entries Septuagint words need to data/lexicon (keeps what is there)
    chunks = collections.defaultdict(dict)
    for s in used_strongs:
        if s in entries:
            chunks['G' + str(int(s[1:5]) // 100)][s] = entries[s]
    added = 0
    for name, new in chunks.items():
        path = os.path.join(LEX_DIR, name + '.json')
        have = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
        for k, e in new.items():
            if k not in have:
                have[k] = e
                added += 1
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(dict(sorted(have.items())), f, ensure_ascii=False, separators=(',', ':'))
    stats['dictionary entries added'] = added
    stats['dictionary forms'] = len(lemmas)
    print(dict(stats))


main()
