// MILTHA Bible search: every KJV verse containing a word or phrase.
//
//   GET /api/search?q=living water&t=all|ot|nt&b=<book id>&o=<offset>
//   GET /api/search?refs=john.3.16,genesis.1.1   → {verses: {"john.3.16": text, ...}}  (up to 60; for search.html?w=)
//   → {total, books: {book: count}, results: [[book, ch, v, text]], terms: [regex source], ref?}
//
// Words: every word must appear (in any order); each also finds its common endings
// (shepherd → shepherds, shepherd's; love → loveth, loved). "Quoted words" must appear together, in order.
// Searches data/search/bible.json (built by tools/build_search.py); loaded once per server instance.

import { findRefs, bookLabel } from '../lib/refs.mjs';
import { siteOrigin, json } from '../lib/auth.mjs';

const PAGE = 50;
const ENDINGS = "(?:s|es|'s|s'|eth|est|ed|d|ing|th|st|n)?";
let VERSES = null, BOOK_ORDER = null, BY_REF = null;

async function load(origin) {
  if (!VERSES) {
    const r = await fetch(origin + '/data/search/bible.json');
    if (!r.ok) throw new Error('bible.json ' + r.status);
    VERSES = (await r.json()).map((x) => [x[0], x[1], x[2], x[3], x[3].toLowerCase().replace(/[’‘]/g, "'")]);
    BOOK_ORDER = [...new Set(VERSES.map((x) => x[0]))];
  }
  return VERSES;
}

// Query → regular expressions (one per word or quoted phrase). Only letters and apostrophes are kept.
export function parse(q) {
  const parts = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m;
  while ((m = re.exec(q)) && parts.length < 8) {
    const words = (m[1] || m[2]).toLowerCase().replace(/[’‘]/g, "'").match(/[a-z']+/g);
    if (!words) continue;
    const w = words.map((x) => x.replace(/^'+|'+$/g, '')).filter(Boolean);
    if (!w.length) continue;
    // a phrase: the words in order, separated by anything that isn't a letter; the last word may take an ending
    parts.push(w.map((x, i) => x + (i === w.length - 1 ? ENDINGS : '')).join("[^a-z']+"));
  }
  return parts.map((p) => `(?<![a-z'])${p}(?![a-z])`);
}

export default async (req) => {
  const url = new URL(req.url);
  const refs = url.searchParams.get('refs');
  if (refs) {
    let all;
    try { all = await load(siteOrigin(req)); } catch (e) { return json(503, { error: 'Search is unavailable right now. Please try again.' }); }
    if (!BY_REF) { BY_REF = new Map(); for (const x of all) BY_REF.set(`${x[0]}.${x[1]}.${x[2]}`, x[3]); }
    const verses = {};
    for (const k of refs.split(',').slice(0, 60)) if (BY_REF.has(k)) verses[k] = BY_REF.get(k);
    return new Response(JSON.stringify({ verses }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } });
  }
  const q = (url.searchParams.get('q') || '').slice(0, 120).trim();
  const t = url.searchParams.get('t') || 'all';
  const b = url.searchParams.get('b') || '';
  const o = Math.max(0, Math.min(100000, parseInt(url.searchParams.get('o') || '0', 10) || 0));
  if (!q) return json(400, { error: 'Type a word or phrase to search for.' });

  let verses;
  try { verses = await load(siteOrigin(req)); } catch (e) { console.error(e); return json(503, { error: 'Search is unavailable right now. Please try again.' }); }

  const ref = findRefs(q)[0];
  const terms = parse(q.replace(/\b[1-3]?\s?[A-Za-z]+\.?\s+\d+:\d+(-\d+)?/g, ref ? ' ' : '$&'));
  const out = { total: 0, books: {}, results: [], terms };
  if (ref) out.ref = { book: ref.book, ch: ref.ch, v: ref.from, label: `${bookLabel(ref.book)} ${ref.ch}:${ref.from}` };
  if (!terms.length) return json(200, out);

  const res = terms.map((x) => new RegExp(x));
  const ntStart = BOOK_ORDER.indexOf('matthew');
  for (const x of verses) {
    if (!res.every((r) => r.test(x[4]))) continue;
    const bi = BOOK_ORDER.indexOf(x[0]);
    if ((t === 'ot' && bi >= ntStart) || (t === 'nt' && bi < ntStart)) continue;
    out.books[x[0]] = (out.books[x[0]] || 0) + 1;
    if (b && x[0] !== b) continue;
    if (out.total >= o && out.results.length < PAGE) out.results.push([x[0], x[1], x[2], x[3]]);
    out.total++;
  }
  return new Response(JSON.stringify(out), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
};

export const config = {
  path: '/api/search',
  rateLimit: { windowLimit: 90, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
