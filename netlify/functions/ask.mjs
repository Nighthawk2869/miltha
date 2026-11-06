// MILTHA Knowledge Engine — server-side relay to the Claude API.
//
// The browser posts {question, history} to /api/ask. Before asking Claude, this function looks up the
// passages from MILTHA's own texts that bear on the question (retrieval):
//   - any Bible verses the question names (KJV text), and where the Church Fathers cite them
//     (data/fathers-refs, built by tools/build_library.py);
//   - the best-matching passages from the 51 Church Father works in the Library
//     (data/search/fathers.json, built by tools/build_search.py), ranked with BM25.
// Claude answers from those numbered passages [S1], [S2]... and the page links each one to the Library
// or the Bible. The function adds the instructions and the secret API key, which never leave the server,
// and returns {answer, sources}.
//
// Netlify settings (Site configuration → Environment variables):
//   ANTHROPIC_API_KEY   required — from console.anthropic.com
//   ANTHROPIC_MODEL     optional — defaults to claude-sonnet-5-5
// If no key is set, Netlify's AI Gateway may supply ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL itself;
// requests then go through the gateway and are billed to the Netlify account.

const SYSTEM = `You are MILTHA's Knowledge Engine — an AI theological research assistant for a Christian platform focused on the earliest manuscript traditions of Scripture.

YOUR ONLY SOURCES (strictly these — no exceptions):
- Aramaic Peshitta (the Syriac Bible; New Testament translation commonly dated to the 2nd–5th centuries AD)
- Hebrew Masoretic Text and Septuagint (LXX, translated from c. 250 BC)
- Greek Textus Receptus and the early manuscripts (Sinaiticus, Vaticanus, P52, etc.)
- Church Fathers ONLY: Ignatius of Antioch (c.35-108 AD), Polycarp of Smyrna (c.69-155 AD), Justin Martyr (c.100-165 AD), Irenaeus of Lyon (c.130-202 AD), Tertullian (c.155-220 AD), Clement of Alexandria (c.150-215 AD)
- Archaeological: Pilate Stone, Pool of Siloam, Ossuary of Caiaphas, Dead Sea Scrolls, Rylands P52, Sea of Galilee Boat, Erastus Inscription
- Secular historians: Tacitus, Josephus, Pliny the Younger, Thallus, Lucian of Samosata

HARD RULES:
- NEVER cite modern commentators, theologians, or pastors (no Calvin, Luther, MacArthur, Piper, etc.)
- NEVER offer denominational interpretation or take sides in theological disputes
- Each question comes with numbered passages from MILTHA's own texts ([S1], [S2]...): Bible verses and passages from the Church Fathers in MILTHA's Library. Base your answer on them first. When you quote or draw on one, put its number right after, like this: "the Word was God" [S1] (one number per bracket, never a range). Use only numbers that were given. Some passages are only loose search matches: leave out any that do not help, without mentioning them.
- Quote a Church Father word for word ONLY from the numbered passages. For anything else a Father wrote, describe it without quotation marks and say it is a summary.
- If the numbered passages do not answer the question, say so plainly, then answer briefly from the sources above as best you can. Never cite a numbered passage for something it does not say.
- Some passages come where a Father is describing or answering someone else's views (for example Irenaeus on the Gnostics); do not present those views as the Father's own.
- ALWAYS cite your source precisely (e.g., "PESHITTA · John 1:1" or "IGNATIUS · Epistle to the Ephesians, c.107 AD")
- When quoting the Peshitta, include the key Aramaic term and its transliteration
- Note transparently where the KJV differs from the earliest manuscripts (Comma Johanneum, Mark 16:9-20, John 7:53-8:11, etc.)
- Never invent a quotation, a reference, or a date. If you are not certain of exact wording, paraphrase and say so; if the sources are silent or scholars disagree, say that plainly.
- Be scholarly but accessible — write for a sincere believer, not only an academic
- Be direct about verified historical facts; be clearly humble about theological interpretations
- Keep answers focused: about 200-350 words in 2-4 short paragraphs, then the SOURCE lines. Plain text with **bold** for key terms; no headings, lists or tables.
- If a question is not about Scripture, the Church Fathers, or early Christian history, kindly say that the Knowledge Engine only answers those questions.
- End every response with 2-3 specific source citations, each on its own line, formatted as: SOURCE: [Name] · [Work] · [Date]. These lines are for sources other than the numbered passages; the numbered passages are listed for the reader automatically.

PLATFORM CONTEXT:
MILTHA's English texts are the King James Version (1769 standard text) and Young's Literal Translation (1898). Its original-language texts are the Hebrew Westminster Leningrad Codex, the Greek Textus Receptus and the Septuagint, and the Syriac Peshitta. Its Library holds the complete surviving writings of the Apostolic Fathers, Justin Martyr, Irenaeus, Clement of Alexandria and Tertullian (Ante-Nicene Fathers and Lightfoot translations). MILTHA (ܡܸܠܬ݂ܵܐ) is the Aramaic word for "The Word" in John 1:1 in the Peshitta.`;

const MAX_QUESTION = 2000;      // characters
const MAX_TURNS = 4;            // earlier question/answer pairs sent for context
const MAX_ANSWER = 6000;        // characters of each earlier answer kept

// ---------- Retrieval from MILTHA's own texts ----------

const BOOKS = [
  ['genesis','genesis gen gn'],['exodus','exodus exod exo ex'],['leviticus','leviticus lev lv'],['numbers','numbers num nm'],
  ['deuteronomy','deuteronomy deut dt'],['joshua','joshua josh'],['judges','judges judg jdg'],['ruth','ruth'],
  ['1samuel','1 samuel|1 sam|i samuel|first samuel'],['2samuel','2 samuel|2 sam|ii samuel|second samuel'],
  ['1kings','1 kings|1 kgs|i kings|first kings'],['2kings','2 kings|2 kgs|ii kings|second kings'],
  ['1chronicles','1 chronicles|1 chron|1 chr|i chronicles|first chronicles'],['2chronicles','2 chronicles|2 chron|2 chr|ii chronicles|second chronicles'],
  ['ezra','ezra'],['nehemiah','nehemiah neh'],['esther','esther esth'],['job','job'],['psalms','psalms psalm ps psa'],
  ['proverbs','proverbs prov prv'],['ecclesiastes','ecclesiastes eccl eccles ecc'],['song','song of solomon|song of songs|song|canticles'],
  ['isaiah','isaiah isa'],['jeremiah','jeremiah jer'],['lamentations','lamentations lam'],['ezekiel','ezekiel ezek'],
  ['daniel','daniel dan'],['hosea','hosea hos'],['joel','joel'],['amos','amos'],['obadiah','obadiah obad'],['jonah','jonah'],
  ['micah','micah mic'],['nahum','nahum nah'],['habakkuk','habakkuk hab'],['zephaniah','zephaniah zeph'],['haggai','haggai hag'],
  ['zechariah','zechariah zech'],['malachi','malachi mal'],
  ['matthew','matthew matt mat mt'],['mark','mark mk mrk'],['luke','luke lk'],['john','john jn jhn'],['acts','acts'],
  ['romans','romans rom'],['1corinthians','1 corinthians|1 cor|i corinthians|first corinthians'],
  ['2corinthians','2 corinthians|2 cor|ii corinthians|second corinthians'],['galatians','galatians gal'],
  ['ephesians','ephesians eph'],['philippians','philippians phil'],['colossians','colossians col'],
  ['1thessalonians','1 thessalonians|1 thess|i thessalonians|first thessalonians'],
  ['2thessalonians','2 thessalonians|2 thess|ii thessalonians|second thessalonians'],
  ['1timothy','1 timothy|1 tim|i timothy|first timothy'],['2timothy','2 timothy|2 tim|ii timothy|second timothy'],
  ['titus','titus'],['philemon','philemon phlm'],['hebrews','hebrews heb'],['james','james jas'],
  ['1peter','1 peter|1 pet|i peter|first peter'],['2peter','2 peter|2 pet|ii peter|second peter'],
  ['1john','1 john|1 jn|i john|first john'],['2john','2 john|2 jn|ii john|second john'],['3john','3 john|3 jn|iii john|third john'],
  ['jude','jude'],['revelation','revelation revelations rev apocalypse'],
];
const ALIASES = [];
for (const [id, list] of BOOKS) {
  const names = list.includes('|') ? list.split('|') : list.split(' ');
  for (const n of names) ALIASES.push([n, id]);
}
ALIASES.sort((a, b) => b[0].length - a[0].length);
const BOOK_RE = new RegExp('(?<![A-Za-z0-9])(' + ALIASES.map(([n]) => n.replace(/ /g, '\\.?\\s*')).join('|') +
  ')\\.?\\s+(\\d{1,3})\\s*[:.]\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?', 'gi');
const aliasId = (s) => { const k = s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
  for (const [n, id] of ALIASES) if (n === k || n.replace(/ /g, '') === k.replace(/ /g, '')) return id; return null; };
const DISPLAY = { song: 'Song of Solomon', psalms: 'Psalm' };
export const bookLabel = (id) => DISPLAY[id] || id.replace(/^(\d)/, '$1 ').replace(/(^| )([a-z])/g, (m, a, b) => a + b.toUpperCase());

// Bible references named in the text: [{book, ch, from, to}]
export function findRefs(text) {
  const out = [];
  for (const m of text.matchAll(BOOK_RE)) {
    const book = aliasId(m[1]); if (!book) continue;
    const ch = +m[2], from = +m[3], to = Math.min(Math.max(+m[4] || from, from), from + 5);
    if (!out.some((r) => r.book === book && r.ch === ch && r.from === from)) out.push({ book, ch, from, to });
  }
  return out.slice(0, 3);
}

const STOP = new Set(`a about above after again against all also am an and any are as at be because been before being below between
both but by can could did do does doing down during each early earliest few for from further had has have having he her here hers him
his how i if in into is it its itself just me more most my no nor not now of off on once only or other our out over own same she should
so some such than that the their them then there these they this those through to too under until up very was we were what when where
which while who whom why will with would you your yours tell explain say said says teach taught teaching believe believed think thought
view views write wrote written mean means meaning church father fathers christian christians early first century centuries ancient
according regarding concerning anything something give please did does thee thou thy thine ye unto hath doth saith shall shalt upon
also therefore wherefore yea nay us one many much way whether thing things even though yet let may might must`.split(/\s+/));
const stem = (w) => w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y'
  : w.length > 4 && /[^s]s$/.test(w) ? w.slice(0, -1) : w;
export const tokens = (t) => (t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z]+/g) || [])
  .filter((w) => w.length > 2 && !STOP.has(w)).map(stem);

// Author names in a question boost that author's works.
const AUTHORS = { ignatius: 'ign-', polycarp: 'polycarp|martyrdom-of-polycarp', clement: '1-clement|clement-', justin: 'justin-',
  irenaeus: 'irenaeus-', tertullian: 'tertullian-', didache: 'didache', diognetus: 'diognetus', barnabas: 'barnabas', hermas: 'hermas' };

let CORPUS = null;   // {rows, df, len, avg, post: Map(term -> [[row, tf]...]), byPara: Map}
let WORKS = null;
const bibleCache = new Map(), refsCache = new Map();

async function getJSON(origin, path) {
  const r = await fetch(origin + '/' + path);
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
}

async function loadCorpus(origin) {
  if (CORPUS) return CORPUS;
  const [rows, works] = await Promise.all([getJSON(origin, 'data/search/fathers.json'), getJSON(origin, 'data/fathers-refs/works.json')]);
  const post = new Map(), len = new Array(rows.length), byPara = new Map();
  rows.forEach((row, i) => {
    const counts = new Map();
    for (const t of tokens(row[3])) counts.set(t, (counts.get(t) || 0) + 1);
    len[i] = [...counts.values()].reduce((a, b) => a + b, 0);
    for (const [t, c] of counts) { let l = post.get(t); if (!l) post.set(t, l = []); l.push([i, c]); }
    const k = row[0] + '/' + row[1] + '/' + row[2]; const p = byPara.get(k); p ? p.push(i) : byPara.set(k, [i]);
  });
  const avg = len.reduce((a, b) => a + b, 0) / rows.length;
  WORKS = works;
  CORPUS = { rows, post, len, avg, byPara };
  return CORPUS;
}

// BM25 over the Library passages; at most 2 passages per work.
export function search(C, query, n = 5) {
  const q = [...new Set(tokens(query))];
  if (!q.length) return [];
  const N = C.rows.length, k1 = 1.2, b = 0.75, score = new Map();
  for (const t of q) {
    const l = C.post.get(t); if (!l || l.length > N * 0.25) continue;   // skip terms in a quarter of all passages
    const idf = Math.log(1 + (N - l.length + 0.5) / (l.length + 0.5));
    for (const [i, tf] of l) score.set(i, (score.get(i) || 0) + idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * C.len[i] / C.avg)));
  }
  const ql = query.toLowerCase(), boost = [];
  for (const [name, pre] of Object.entries(AUTHORS)) if (ql.includes(name)) boost.push(...pre.split('|'));
  if (boost.length) for (const [i, s] of score) if (boost.some((p) => C.rows[i][0].startsWith(p))) score.set(i, s * 2.5);
  const out = [], perWork = {}, ranked = [...score].sort((a, b) => b[1] - a[1]);
  const floor = ranked.length ? ranked[0][1] * 0.4 : 0;    // drop weak matches
  for (const [i, sc] of ranked) {
    if (sc < floor) break;
    const w = C.rows[i][0];
    if ((perWork[w] || 0) >= 2) continue;
    perWork[w] = (perWork[w] || 0) + 1; out.push(i);
    if (out.length >= n) break;
  }
  return out;
}

const trim = (t, max) => t.length <= max ? t : t.slice(0, t.lastIndexOf(' ', max)) + ' …';

function fatherSource(C, i, note) {
  const [work, ch, para, text] = C.rows[i];
  const [author, title, date] = WORKS[work] || [work, '', ''];
  return { kind: 'father', label: `${author} · ${title}${date ? ' · ' + date : ''}`, href: `library.html#${work}/${ch}/${para}`,
           text: trim(text, 1300), note };
}

async function gather(origin, question, history) {
  const sources = [];
  const refs = findRefs(question);
  let C = null;
  try { C = await loadCorpus(origin); } catch (e) { console.error('Library search unavailable', e); }

  for (const r of refs) {
    try {
      let book = bibleCache.get(r.book);
      if (!book) { book = await getJSON(origin, `data/bible/kjv/${r.book}.json`); bibleCache.set(r.book, book); }
      const verses = (book[r.ch - 1] || []).slice(r.from - 1, r.to).filter(Boolean);
      if (!verses.length) continue;
      const ref = `${bookLabel(r.book)} ${r.ch}:${r.from}${r.to > r.from ? '–' + r.to : ''}`;
      sources.push({ kind: 'bible', label: `KJV · ${ref}`, href: `study.html#${r.book}/${r.ch}/${r.from}`,
                     text: verses.map((v, k) => `${r.from + k} ${v}`).join(' ') });
      // Where the Fathers cite this verse
      if (!C) continue;
      const key = r.book + '/' + r.ch;
      let cites = refsCache.get(key);
      if (cites === undefined) { cites = await getJSON(origin, `data/fathers-refs/${key}.json`).catch(() => null); refsCache.set(key, cites); }
      const seen = new Set();
      for (let v = r.from; v <= r.to && seen.size < 3; v++) {
        for (const [work, ch, para, excerpt] of (cites?.[v] || [])) {
          if (seen.size >= 3 || seen.has(work)) continue;
          const pieces = C.byPara.get(`${work}/${ch}/${para}`) || [];
          const tail = excerpt.replace(/^…|…$/g, '').trim().slice(-40);
          const i = pieces.find((j) => C.rows[j][3].includes(tail)) ?? pieces[0];
          if (i === undefined) continue;
          seen.add(work);
          sources.push(fatherSource(C, i, `cites ${ref.replace(/[:–].*/, '')}:${v}`));
        }
      }
    } catch (e) { console.error('Verse lookup failed', r, e); }
  }

  if (C) {
    // Follow-up questions ("what did he mean?") borrow the previous question's words.
    let query = question.replace(BOOK_RE, ' ');
    if (tokens(question).length < 3 && history.length) query += ' ' + history[history.length - 1].q;
    const have = new Set(sources.map((s) => s.href));
    for (const i of search(C, query, refs.length ? 4 : 7)) {
      if (sources.length >= 9) break;
      const s = fatherSource(C, i);
      if (!have.has(s.href)) { have.add(s.href); sources.push(s); }
    }
  }
  return sources.map((s, k) => ({ n: k + 1, ...s }));
}

function sourceBlock(sources) {
  if (!sources.length) return 'No passages from MILTHA\'s texts matched this question.';
  return 'PASSAGES FROM MILTHA\'S TEXTS (cite as [S1], [S2]...):\n\n' +
    sources.map((s) => `[S${s.n}] ${s.label}${s.note ? ' (' + s.note + ')' : ''}\n${s.text}`).join('\n\n');
}

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' });

  const key = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!key) return json(503, { error: 'not_configured' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid request.' }); }

  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!question) return json(400, { error: 'Please type a question.' });
  if (question.length > MAX_QUESTION) return json(400, { error: `Please keep questions under ${MAX_QUESTION} characters.` });

  const history = Array.isArray(body.history) ? body.history.slice(-MAX_TURNS) : [];
  const messages = [];
  for (const h of history) {
    if (typeof h?.q !== 'string' || typeof h?.a !== 'string' || !h.q.trim() || !h.a.trim()) continue;
    messages.push({ role: 'user', content: h.q.slice(0, MAX_QUESTION) });
    // Earlier answers' [S#] numbers referred to earlier passages, so they are removed.
    messages.push({ role: 'assistant', content: h.a.slice(0, MAX_ANSWER).replace(/\s?\[S\d+\]/g, '') });
  }
  const origin = new URL(req.url).origin;
  const sources = await gather(origin, question, history.filter((h) => typeof h?.q === 'string'));
  messages.push({ role: 'user', content: `${sourceBlock(sources)}\n\n---\n\nQUESTION: ${question}` });

  let res;
  try {
    const base = (Netlify.env.get('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com').replace(/\/+$/, '');
    res = await fetch(base + '/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: Netlify.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-5-5',
        max_tokens: 3000,
        system: SYSTEM,
        messages,
      }),
    });
  } catch (e) {
    console.error('Claude API unreachable', e);
    return json(502, { error: 'The Knowledge Engine could not be reached. Please try again.' });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Log the detail for the site owner (Netlify → Logs → Functions); keep the visitor message simple.
    console.error('Claude API error', res.status, JSON.stringify(data?.error || data));
    const busy = res.status === 429 || res.status === 529;
    return json(busy ? 503 : 502, {
      code: res.status,
      error: busy ? 'The Knowledge Engine is busy right now. Please try again in a minute.'
                  : 'The Knowledge Engine had a problem answering. Please try again.',
    });
  }

  const answer = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  if (data.stop_reason === 'max_tokens') console.warn('Answer cut off at max_tokens');
  if (!answer) return json(502, { error: 'The Knowledge Engine returned no answer. Please try again.' });
  const used = new Set();
  for (const m of answer.matchAll(/\[S(\d+)(?:\s*[–-]\s*S?(\d+))?\]/g))
    for (let k = +m[1]; k <= Math.min(+(m[2] || m[1]), +m[1] + 9); k++) used.add(k);
  return json(200, { answer, sources: sources.filter((s) => used.has(s.n)).map(({ n, kind, label, href, note }) => ({ n, kind, label, href, note })) });
};

export const config = {
  path: '/api/ask',
  // Limits each visitor to 10 questions a minute, to protect the API budget.
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
