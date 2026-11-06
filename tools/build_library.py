#!/usr/bin/env python3
"""Build the MILTHA Library: the full texts of the early Church Fathers.

Usage: python3 tools/build_library.py <dir with CCEL ANF anf01.xml..anf04.xml> <CCEL lightfoot fathers.xml>

Sources (both Public Domain, as marked in the CCEL files):
  * J. B. Lightfoot & J. R. Harmer, The Apostolic Fathers (1891) — ccel.org/ccel/lightfoot/fathers
    Used for the earliest writings, and for Ignatius because it gives only his seven genuine letters.
  * A. Roberts, J. Donaldson & A. C. Coxe (eds.), Ante-Nicene Fathers I-IV (1885-87) — ccel.org/ccel/schaff
    Used for Justin Martyr, Irenaeus, Clement of Alexandria and Tertullian.

Only the Fathers' own words are kept: the editors' introductions, notes, footnotes and
"elucidations" are left out, as are page breaks and index markers.

Output:
  data/library/index.json        authors -> works -> chapter titles (for the table of contents)
  data/library/<work-id>.json    {"id", "title", "author", "date", "source", "chapters": [{"t": title, "p": [para, ...]}]}
  data/fathers-refs/<book>/<ch>.json  {"<verse>": [[work id, chapter no., paragraph no., excerpt], ...]}
                                 — where the Fathers quote or allude to each verse, from the Bible references
                                 the 1885 editors marked (Lightfoot's edition marks none, so it is not indexed).
"""
import html, json, os, re, sys
from lxml import etree

ANF, LIGHTFOOT = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'library')
SRC_L = 'J. B. Lightfoot & J. R. Harmer, The Apostolic Fathers (1891) · Public Domain · via CCEL'
SRC_A = 'Ante-Nicene Fathers, ed. Roberts, Donaldson & Coxe (1885–87) · Public Domain · via CCEL'

AUTHORS = [
    {'id': 'clement-of-rome', 'name': 'CLEMENT OF ROME', 'dates': 'c. AD 96 · BISHOP OF ROME',
     'note': 'Writing within the lifetime of some who had known the Apostles, Clement sends the oldest Christian letter outside the New Testament.'},
    {'id': 'didache', 'name': 'THE DIDACHE', 'dates': 'c. AD 50–120 · AUTHOR UNKNOWN',
     'note': '"The Teaching of the Lord through the Twelve Apostles" — an early handbook on the Christian life, baptism, the Eucharist and church order.'},
    {'id': 'ignatius', 'name': 'IGNATIUS OF ANTIOCH', 'dates': 'c. 35–108 AD · BISHOP · MARTYR',
     'note': 'Seven letters written on his way to martyrdom in Rome.'},
    {'id': 'polycarp', 'name': 'POLYCARP OF SMYRNA', 'dates': 'c. 69–155 AD · BISHOP · MARTYR',
     'note': 'His letter to the Philippians, and the account of his martyrdom written by the church of Smyrna.'},
    {'id': 'diognetus', 'name': 'THE LETTER TO DIOGNETUS', 'dates': '2ND CENTURY · AUTHOR UNKNOWN',
     'note': 'An anonymous defence of the faith describing how Christians live in the world.'},
    {'id': 'justin', 'name': 'JUSTIN MARTYR', 'dates': 'c. 100–165 AD · APOLOGIST · MARTYR', 'note': ''},
    {'id': 'irenaeus', 'name': 'IRENAEUS OF LYON', 'dates': 'c. 130–202 AD · BISHOP', 'note': ''},
    {'id': 'clement-of-alexandria', 'name': 'CLEMENT OF ALEXANDRIA', 'dates': 'c. 150–215 AD · TEACHER', 'note': ''},
    {'id': 'tertullian', 'name': 'TERTULLIAN', 'dates': 'c. 155–220 AD · APOLOGIST', 'note': ''},
]

# Lightfoot works: (work id, author id, div2 title, display title, date)
LIGHTFOOT_WORKS = [
    ('1-clement', 'clement-of-rome', 'First Clement', 'First Epistle to the Corinthians', 'c. AD 96'),
    ('didache', 'didache', 'Didache', 'The Didache (The Teaching of the Twelve Apostles)', 'c. AD 50–120'),
    ('ign-ephesians', 'ignatius', 'The Epistle of Ignatius to the Ephesians', 'To the Ephesians', 'c. AD 107'),
    ('ign-magnesians', 'ignatius', 'The Epistle of Ignatius to the Magnesians', 'To the Magnesians', 'c. AD 107'),
    ('ign-trallians', 'ignatius', 'The Epistle of Ignatius to the Trallians', 'To the Trallians', 'c. AD 107'),
    ('ign-romans', 'ignatius', 'The Epistle of Ignatius to the Romans', 'To the Romans', 'c. AD 107'),
    ('ign-philadelphians', 'ignatius', 'The Epistle of Ignatius to the Philadelphians', 'To the Philadelphians', 'c. AD 107'),
    ('ign-smyrnaeans', 'ignatius', 'The Epistle of Ignatius to the Smyrnaeans', 'To the Smyrnaeans', 'c. AD 107'),
    ('ign-polycarp', 'ignatius', 'The Epistle fo Ignatius to Polycarp', 'To Polycarp', 'c. AD 107'),
    ('polycarp-philippians', 'polycarp', 'The Epistle of Polycarp', 'Epistle to the Philippians', 'c. AD 110'),
    ('martyrdom-of-polycarp', 'polycarp', 'The Martyrdom of Polycarp', 'The Martyrdom of Polycarp (by the church of Smyrna)', 'c. AD 156'),
    ('diognetus', 'diognetus', 'The Epistle to Diognetus', 'The Epistle to Diognetus', '2nd century'),
]
# ANF works: (work id, author id, volume, div2 title, display title, date)
ANF_WORKS = [
    ('justin-1-apology', 'justin', 'anf01', 'The First Apology', 'The First Apology', 'c. AD 155'),
    ('justin-2-apology', 'justin', 'anf01', 'The Second Apology', 'The Second Apology', 'c. AD 160'),
    ('justin-trypho', 'justin', 'anf01', 'Dialogue with Trypho', 'Dialogue with Trypho', 'c. AD 160'),
    ('irenaeus-heresies', 'irenaeus', 'anf01', 'Against Heresies: Book', 'Against Heresies (Books I–V)', 'c. AD 180'),
    ('clement-exhortation', 'clement-of-alexandria', 'anf02', 'Exhortation to the Heathen', 'Exhortation to the Heathen', 'c. AD 195'),
    ('clement-instructor', 'clement-of-alexandria', 'anf02', 'The Instructor', 'The Instructor (Paedagogus)', 'c. AD 198'),
    ('clement-stromata', 'clement-of-alexandria', 'anf02', 'The Stromata, or Miscellanies', 'The Stromata, or Miscellanies', 'c. AD 198–203'),
    ('clement-rich-man', 'clement-of-alexandria', 'anf02', 'Who is the Rich Man that shall be saved?', 'Who Is the Rich Man That Shall Be Saved?', 'c. AD 200'),
]
TERTULLIAN = [  # (volume, div2 title, date)
    ('anf03', 'Apology.', 'c. AD 197'), ('anf03', 'On Idolatry.', 'c. AD 200'),
    ('anf03', 'The Shows, or De Spectaculis.', 'c. AD 200'), ('anf03', 'The Chaplet, or De Corona.', 'c. AD 211'),
    ('anf03', 'To Scapula.', 'c. AD 212'), ('anf03', 'Ad Nationes.', 'c. AD 197'),
    ('anf03', 'An Answer to the Jews.', 'c. AD 200'), ('anf03', "The Soul's Testimony.", 'c. AD 197'),
    ('anf03', 'A Treatise on the Soul.', 'c. AD 210'), ('anf03', 'The Prescription Against Heretics.', 'c. AD 200'),
    ('anf03', 'The Five Books Against Marcion.', 'c. AD 207'), ('anf03', 'Against Hermogenes.', 'c. AD 200'),
    ('anf03', 'Against the Valentinians.', 'c. AD 206'), ('anf03', 'On the Flesh of Christ.', 'c. AD 206'),
    ('anf03', 'On the Resurrection of the Flesh.', 'c. AD 208'), ('anf03', 'Against Praxeas.', 'c. AD 213'),
    ('anf03', 'Scorpiace.', 'c. AD 211'), ('anf03', 'On Repentance.', 'c. AD 203'), ('anf03', 'On Baptism.', 'c. AD 200'),
    ('anf03', 'On Prayer.', 'c. AD 198'), ('anf03', 'Ad Martyras.', 'c. AD 197'), ('anf03', 'On Patience.', 'c. AD 200'),
    ('anf04', 'On the Pallium.', 'c. AD 209'), ('anf04', 'On the Apparel of Women.', 'c. AD 202'),
    ('anf04', 'On the Veiling of Virgins.', 'c. AD 207'), ('anf04', 'To His Wife.', 'c. AD 203'),
    ('anf04', 'On Exhortation to Chastity.', 'c. AD 208'), ('anf04', 'On Monogamy.', 'c. AD 217'),
    ('anf04', 'On Modesty.', 'c. AD 220'), ('anf04', 'On Fasting.', 'c. AD 213'),
    ('anf04', 'De Fuga in Persecutione.', 'c. AD 208'),
]
SKIP_TITLE = re.compile(r'introductory|introduction|elucidation|prefatory|notice|^title page|translator|editor|^epistle of (adrian|antoninus|marcus)|^fragments', re.I)


def slug(t):
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')


def fix_text(t):
    t = re.sub(r'(\w)- (\w)', r'\1-\2', t)          # a word split across a line end: "in- generate"
    t = re.sub(r'\s*--\s*', '—', t)                    # typed double hyphens -> dash
    return t


def text_of(p, refs=None):
    """Paragraph text without footnotes, index markers or page breaks.
    If `refs` is a list, the Bible references marked in the paragraph (in its notes or inline)
    are appended to it as (character position in the returned text, OSIS reference)."""
    parts, marks = [], []

    def walk(e, top=False):
        tag = e.tag if isinstance(e.tag, str) else ''
        if tag == 'note':
            for sr in e.iter('scripRef'):
                if sr.get('osisRef'):
                    marks.append((''.join(parts), sr.get('osisRef')))
        elif tag in ('index', 'pb') or not tag:
            pass
        else:
            if e.text:
                parts.append(e.text)
            for c in e:
                walk(c)
            if tag == 'scripRef' and e.get('osisRef'):
                marks.append((''.join(parts), e.get('osisRef')))
        if not top and e.tail:
            parts.append(e.tail)

    walk(p, top=True)

    def clean(t, final):
        t = re.sub(r'\s+', ' ', t)
        t = t.strip() if final else t.lstrip()
        return re.sub(r'\s+([,.;:?!])', r'\1', t)
    t = clean(''.join(parts), True)
    if re.match(r'^\[Translated by', t):           # translator credit, not the Father's words
        return ''
    t = fix_text(t)
    if refs is not None:
        for prefix, osis in marks:
            refs.append((min(len(fix_text(clean(prefix, False))), len(t)), osis))
    return t


def parse(path):
    parser = etree.XMLParser(recover=True, resolve_entities=False, load_dtd=False, no_network=True, huge_tree=True)
    return etree.parse(path, parser).getroot()


def clean_title(t):
    t = re.sub(r'\s+', ' ', t).strip().rstrip('.')
    return t


def leaf_chapters(div, prefix=''):
    """Chapters = the deepest divs that hold paragraphs; part titles (e.g. 'Book III') are prefixed."""
    chapters = []
    kids = [k for k in div if isinstance(k.tag, str) and re.match(r'div\d', k.tag)]
    own_paras, own_refs = [], []
    for p in div:
        if isinstance(p.tag, str) and p.tag == 'p':
            r = []
            t = text_of(p, r)
            if t:
                own_paras.append(t); own_refs.append(r)
    title = clean_title(div.get('title', ''))
    if own_paras and not kids:
        return [{'t': (prefix + ' · ' if prefix else '') + title, 'p': own_paras, '_r': own_refs}]
    if own_paras:
        chapters.append({'t': (prefix + ' · ' if prefix else '') + title, 'p': own_paras, '_r': own_refs})
    for k in kids:
        kt = clean_title(k.get('title', ''))
        if SKIP_TITLE.search(kt):
            continue
        sub_has_kids = any(isinstance(x.tag, str) and re.match(r'div\d', x.tag) for x in k)
        chapters += leaf_chapters(k, (prefix + ' · ' if prefix else '') + kt if sub_has_kids else prefix)
    return chapters


def strip_markup(fragment):
    fragment = re.sub(r'<note\b.*?</note>', '', fragment, flags=re.S)
    fragment = re.sub(r'<[^>]+>', '', fragment)
    t = html.unescape(re.sub(r'\s+', ' ', fragment)).strip()
    return re.sub(r'\s+([,.;:?!])', r'\1', t)


def lightfoot_work(raw, div_title):
    """Lightfoot's file marks chapters with headings such as "1 Clem. 5" or "IgnEph. 7"; read them in order."""
    start = raw.index('title="%s"' % div_title)
    nxt = raw.find('<div2', start + 10)
    seg = raw[start: nxt if nxt > 0 else len(raw)]
    chapters, cur = [], None
    for m in re.finditer(r'<h(\d)[^>]*>(.*?)</h\1>|<p\b[^>]*>(.*?)</p>', seg, flags=re.S):
        if m.group(2) is not None:
            h = strip_markup(m.group(2))
            mm = re.match(r'^(?:\d\s*)?[A-Za-z]+\.?\s*(Prologue|\d+)$', h)
            if mm:
                cur = {'t': 'Greeting' if mm.group(1) == 'Prologue' else 'Chapter ' + mm.group(1), 'p': []}
                chapters.append(cur)
        elif cur is not None:
            t = fix_text(strip_markup(m.group(3)))
            if t:
                cur['p'].append(t)
    return [c for c in chapters if c['p']]


OSIS = {'Gen': 'genesis', 'Exod': 'exodus', 'Lev': 'leviticus', 'Num': 'numbers', 'Deut': 'deuteronomy',
        'Josh': 'joshua', 'Judg': 'judges', 'Ruth': 'ruth', '1Sam': '1samuel', '2Sam': '2samuel', '1Kgs': '1kings',
        '2Kgs': '2kings', '1Chr': '1chronicles', '2Chr': '2chronicles', 'Ezra': 'ezra', 'Neh': 'nehemiah',
        'Esth': 'esther', 'Job': 'job', 'Ps': 'psalms', 'Prov': 'proverbs', 'Eccl': 'ecclesiastes', 'Song': 'song',
        'Isa': 'isaiah', 'Jer': 'jeremiah', 'Lam': 'lamentations', 'Ezek': 'ezekiel', 'Dan': 'daniel', 'Hos': 'hosea',
        'Joel': 'joel', 'Amos': 'amos', 'Obad': 'obadiah', 'Jonah': 'jonah', 'Mic': 'micah', 'Nah': 'nahum',
        'Hab': 'habakkuk', 'Zeph': 'zephaniah', 'Hag': 'haggai', 'Zech': 'zechariah', 'Mal': 'malachi',
        'Matt': 'matthew', 'Mark': 'mark', 'Luke': 'luke', 'John': 'john', 'Acts': 'acts', 'Rom': 'romans',
        '1Cor': '1corinthians', '2Cor': '2corinthians', 'Gal': 'galatians', 'Eph': 'ephesians', 'Phil': 'philippians',
        'Col': 'colossians', '1Thess': '1thessalonians', '2Thess': '2thessalonians', '1Tim': '1timothy',
        '2Tim': '2timothy', 'Titus': 'titus', 'Phlm': 'philemon', 'Heb': 'hebrews', 'Jas': 'james', '1Pet': '1peter',
        '2Pet': '2peter', '1John': '1john', '2John': '2john', '3John': '3john', 'Jude': 'jude', 'Rev': 'revelation'}


def osis_verses(osis):
    """'Bible:Matt.5.3' -> [('matthew', 5, 3)]; short ranges give each verse, long ranges just the first."""
    m = re.match(r'^Bible:(\w+)\.(\d+)\.(\d+)(?:-(?:\w+)\.(\d+)\.(\d+))?$', osis)
    if not m or m.group(1) not in OSIS:
        return []
    b, c, v = OSIS[m.group(1)], int(m.group(2)), int(m.group(3))
    if m.group(4) and int(m.group(4)) == c and 0 < int(m.group(5)) - v <= 3:
        return [(b, c, x) for x in range(v, int(m.group(5)) + 1)]
    return [(b, c, v)]


def excerpt(text, anchor, size=260):
    """The words leading up to a reference mark (the quotation it annotates), at word boundaries."""
    end = anchor if anchor > 40 else min(len(text), size)
    start = max(0, end - size)
    if start:
        sp = text.find(' ', start)
        start = sp + 1 if 0 <= sp < end else start
    cut = text[start:end].strip()
    if end < len(text):
        cut = re.sub(r'[\s,;:]+$', '', cut)
    return ('…' if start else '') + cut + ('…' if end < len(text) else '')


def write_verse_refs(verse_refs, works):
    """data/fathers-refs/<book>/<chapter>.json: {"<verse>": [[work id, chapter, paragraph, excerpt], ...]}"""
    out = os.path.join(OUT, '..', 'fathers-refs')
    order = {w['id']: i for i, w in enumerate(works)}
    total = 0
    for book, chapters in verse_refs.items():
        os.makedirs(os.path.join(out, book), exist_ok=True)
        for ch, verses in chapters.items():
            data = {}
            for v in sorted(verses):
                items = sorted(verses[v], key=lambda x: (order[x[0]], x[1], x[2]))
                data[str(v)] = [list(x) for x in items]
                total += len(items)
            with open(os.path.join(out, book, f'{ch}.json'), 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    names = {a['id']: a['name'] for a in AUTHORS}
    with open(os.path.join(out, 'works.json'), 'w', encoding='utf-8') as f:   # labels for the reader
        json.dump({w['id']: [names[w['author']], w['title'], w['date']] for w in works}, f,
                  ensure_ascii=False, separators=(',', ':'))
    print('verse references', total, 'in', sum(len(c) for c in verse_refs.values()), 'chapters')


def main():
    os.makedirs(OUT, exist_ok=True)
    vols = {v: parse(os.path.join(ANF, v + '.xml')) for v in ('anf01', 'anf02', 'anf03', 'anf04')}
    lf = open(LIGHTFOOT, encoding='utf-8').read()
    works = []

    verse_refs = {}

    def save(wid, author, title, date, source, chapters):
        for ci, c in enumerate(chapters, 1):
            for pi, rs in enumerate(c.pop('_r', []), 1):
                for anchor, osis in rs:
                    for book, ch, v in osis_verses(osis):
                        verse_refs.setdefault(book, {}).setdefault(ch, {}).setdefault(v, set()).add(
                            (wid, ci, pi, excerpt(c['p'][pi - 1], anchor)))
        doc = {'id': wid, 'title': title, 'author': author, 'date': date, 'source': source, 'chapters': chapters}
        with open(os.path.join(OUT, wid + '.json'), 'w', encoding='utf-8') as f:
            json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
        words = sum(len(p.split()) for c in chapters for p in c['p'])
        works.append({'id': wid, 'author': author, 'title': title, 'date': date,
                      'chapters': [c['t'] for c in chapters], 'words': words})
        print(f'{wid:28s} {len(chapters):4d} chapters {words:7d} words')

    for wid, author, div_title, title, date in LIGHTFOOT_WORKS:
        save(wid, author, title, date, SRC_L, lightfoot_work(lf, div_title))

    for wid, author, vol, div_title, title, date in ANF_WORKS:
        root = vols[vol]
        if wid == 'irenaeus-heresies':   # five books, each its own div2
            chapters = []
            for d in root.xpath('//div2[starts-with(@title, $t)]', t=div_title):
                book = clean_title(d.get('title')).replace('Against Heresies: ', '')
                chapters += leaf_chapters(d, book)
        else:
            d = root.xpath('//div2[@title=$t]', t=div_title)[0]
            chapters = leaf_chapters(d)
        save(wid, author, title, date, SRC_A, chapters)

    for vol, div_title, date in TERTULLIAN:
        d = vols[vol].xpath('//div2[@title=$t]', t=div_title)
        if not d:
            print('MISSING', div_title); continue
        title = clean_title(div_title)
        save('tertullian-' + slug(title), 'tertullian', title, date, SRC_A, leaf_chapters(d[0]))

    index = []
    for a in AUTHORS:
        aw = [w for w in works if w['author'] == a['id']]
        index.append({**a, 'works': aw})
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, separators=(',', ':'))
    print('works', len(works), 'words', sum(w['words'] for w in works))
    write_verse_refs(verse_refs, works)


main()
