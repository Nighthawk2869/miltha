// MILTHA members' private study data: saved verses with notes, and Daily Word readings.
//
//   GET  /api/member                         → {user, verses, daily}
//   POST /api/member {op:'verse', ref, saved, note}   save / update / remove a verse ("john/3/16")
//   POST /api/member {op:'daily', date, done}         mark a Daily Word day ("2026-11-07") read or unread
//   POST /api/member {op:'erase'}                     delete all of this member's saved data
//
// Stored in Netlify Blobs (store "members", key "u/<identity id>"). Only the member can read it.

import { getStore } from '@netlify/blobs';
import { BOOK_IDS } from '../lib/refs.mjs';
import { currentUser, cleanText, json } from '../lib/auth.mjs';

const MAX_VERSES = 3000, MAX_DAYS = 3000, MAX_NOTE = 4000;
const empty = () => ({ verses: {}, daily: [] });

export default async (req) => {
  const user = await currentUser(req);
  if (!user) return json(401, { error: 'Please sign in.' });
  const store = getStore({ name: 'members', consistency: 'strong' });
  const key = 'u/' + user.id;
  const load = async () => ({ ...empty(), ...((await store.get(key, { type: 'json' })) || {}) });
  const me = { name: user.name, email: user.email, admin: user.admin };

  if (req.method === 'GET') {
    const d = await load();
    return json(200, { user: me, verses: d.verses, daily: d.daily });
  }
  if (req.method !== 'POST') return json(405, { error: 'Use GET or POST.' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid request.' }); }
  const d = await load();

  if (body?.op === 'verse') {
    const ref = String(body.ref || '');
    const m = ref.match(/^([a-z0-9]+)\/(\d{1,3})\/(\d{1,3})$/);
    if (!m || !BOOK_IDS.has(m[1])) return json(400, { error: 'Unknown verse.' });
    if (body.saved === false) delete d.verses[ref];
    else {
      if (!d.verses[ref] && Object.keys(d.verses).length >= MAX_VERSES) return json(400, { error: `You can save up to ${MAX_VERSES} verses.` });
      const prev = d.verses[ref] || { saved: Date.now() };
      d.verses[ref] = { saved: prev.saved, note: body.note === undefined ? (prev.note || '') : cleanText(body.note, MAX_NOTE), updated: Date.now() };
    }
  } else if (body?.op === 'daily') {
    const date = String(body.date || '');
    if (!/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) return json(400, { error: 'Unknown date.' });
    const set = new Set(d.daily);
    body.done === false ? set.delete(date) : set.add(date);
    d.daily = [...set].sort().slice(-MAX_DAYS);
  } else if (body?.op === 'erase') {
    await store.delete(key);
    return json(200, { user: me, ...empty() });
  } else {
    return json(400, { error: 'Unknown request.' });
  }

  await store.setJSON(key, d);
  return json(200, { user: me, verses: d.verses, daily: d.daily });
};

export const config = {
  path: '/api/member',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
