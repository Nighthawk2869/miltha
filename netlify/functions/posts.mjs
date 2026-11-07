// MILTHA Community: posts anchored to a Scripture passage, and replies.
//
//   GET  /api/posts                              → {posts}: approved posts, newest first (plus your own waiting ones)
//   POST /api/posts {op:'post', ref, text}       ref like "John 3:16" or "Romans 8:38-39"; the KJV text is added here
//   POST /api/posts {op:'reply', postId, text}
//
// New posts and replies wait for a moderator (/api/moderate) unless written by a moderator.

import { bookLabel, findRefs } from '../lib/refs.mjs';
import { currentUser, siteOrigin, cleanText, json } from '../lib/auth.mjs';
import { postsStore, newId, allPosts, publicPost } from '../lib/posts.mjs';

const MAX_POST = 2000, MAX_REPLY = 1000, MAX_WAITING = 5;
const kjv = new Map();

async function verseText(origin, r) {
  let book = kjv.get(r.book);
  if (!book) {
    const res = await fetch(`${origin}/data/bible/kjv/${r.book}.json`);
    if (!res.ok) return null;
    book = await res.json(); kjv.set(r.book, book);
  }
  const chapter = book[r.ch - 1]; if (!chapter) return null;
  const vs = chapter.slice(r.from - 1, r.to);
  return vs.length && vs.every(Boolean) ? vs.join(' ') : null;
}

export default async (req) => {
  const user = await currentUser(req);
  const store = postsStore();

  if (req.method === 'GET') {
    const posts = (await allPosts(store)).filter((p) => p.status === 'approved' || (user && p.uid === user.id));
    return json(200, { posts: posts.slice(0, 100).map((p) => publicPost(p, user)), user: user ? { name: user.name, admin: user.admin } : null });
  }
  if (req.method !== 'POST') return json(405, { error: 'Use GET or POST.' });
  if (!user) return json(401, { error: 'Please sign in to post.' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid request.' }); }
  const status = user.admin ? 'approved' : 'pending';

  if (body?.op === 'post') {
    const refText = cleanText(body.ref, 80);
    const r = findRefs(refText)[0];
    if (!r) return json(400, { error: 'Please name the Scripture passage, for example John 3:16 or Romans 8:38-39.' });
    const verse = await verseText(siteOrigin(req), r);
    if (!verse) return json(400, { error: 'That passage was not found. Please check the chapter and verse.' });
    const text = cleanText(body.text, MAX_POST);
    if (text.length < 10) return json(400, { error: 'Please write a little more about the passage.' });
    if (!user.admin) {
      const waiting = (await allPosts(store, 200)).filter((p) => p.uid === user.id && p.status === 'pending').length;
      if (waiting >= MAX_WAITING) return json(429, { error: 'You have several posts waiting for approval. Please wait until they are reviewed.' });
    }
    const p = {
      id: newId(), uid: user.id, name: user.name, email: user.email,
      book: r.book, ch: r.ch, from: r.from, to: r.to,
      label: `${bookLabel(r.book)} ${r.ch}:${r.from}${r.to > r.from ? '–' + r.to : ''}`.toUpperCase() + ' · KJV',
      verse, text, created: Date.now(), status, replies: [],
    };
    await store.setJSON('p/' + p.id, p);
    return json(200, { post: publicPost(p, user), waiting: status === 'pending' });
  }

  if (body?.op === 'reply') {
    const id = String(body.postId || '');
    if (!/^[a-z0-9]{6,20}$/.test(id)) return json(400, { error: 'Unknown post.' });
    const p = await store.get('p/' + id, { type: 'json' });
    if (!p || p.status !== 'approved') return json(404, { error: 'That post was not found.' });
    const text = cleanText(body.text, MAX_REPLY);
    if (text.length < 2) return json(400, { error: 'Please write a reply.' });
    p.replies = p.replies || [];
    if (!user.admin && p.replies.filter((x) => x.uid === user.id && x.status === 'pending').length >= MAX_WAITING)
      return json(429, { error: 'You have several replies waiting for approval here. Please wait until they are reviewed.' });
    if (p.replies.length >= 300) return json(400, { error: 'This discussion is full.' });
    p.replies.push({ id: newId(), uid: user.id, name: user.name, email: user.email, text, created: Date.now(), status });
    await store.setJSON('p/' + p.id, p);
    return json(200, { post: publicPost(p, user), waiting: status === 'pending' });
  }

  return json(400, { error: 'Unknown request.' });
};

export const config = {
  path: '/api/posts',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
