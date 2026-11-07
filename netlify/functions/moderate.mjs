// MILTHA Community moderation (moderators only: MILTHA_ADMINS emails or the Identity "admin" role).
//
//   GET  /api/moderate                                     → {waiting: [...], recent: [...]}
//   POST /api/moderate {postId, replyId?, action}          action: "approve" | "reject"
//
// "reject" hides a post or reply (also one already approved); it is kept, not deleted, and can be approved later.

import { currentUser, json } from '../lib/auth.mjs';
import { postsStore, allPosts } from '../lib/posts.mjs';

const view = (p) => ({
  id: p.id, name: p.name, email: p.email, label: p.label, verse: p.verse, text: p.text, created: p.created, status: p.status,
  replies: (p.replies || []).map((r) => ({ id: r.id, name: r.name, email: r.email, text: r.text, created: r.created, status: r.status })),
});

export default async (req) => {
  const user = await currentUser(req);
  if (!user) return json(401, { error: 'Please sign in.' });
  if (!user.admin) return json(403, { error: 'Only moderators can open this page.' });
  const store = postsStore();

  if (req.method === 'GET') {
    const posts = await allPosts(store, 500);
    const waiting = posts.filter((p) => p.status === 'pending' || (p.replies || []).some((r) => r.status === 'pending'));
    const recent = posts.filter((p) => !waiting.includes(p)).slice(0, 50);
    return json(200, { waiting: waiting.map(view), recent: recent.map(view) });
  }
  if (req.method !== 'POST') return json(405, { error: 'Use GET or POST.' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid request.' }); }
  const status = { approve: 'approved', reject: 'rejected' }[body?.action];
  const id = String(body?.postId || '');
  if (!status || !/^[a-z0-9]{6,20}$/.test(id)) return json(400, { error: 'Unknown request.' });
  const p = await store.get('p/' + id, { type: 'json' });
  if (!p) return json(404, { error: 'That post was not found.' });
  if (body.replyId) {
    const r = (p.replies || []).find((x) => x.id === String(body.replyId));
    if (!r) return json(404, { error: 'That reply was not found.' });
    r.status = status;
  } else {
    p.status = status;
  }
  p.moderated = Date.now();
  await store.setJSON('p/' + p.id, p);
  return json(200, { post: view(p) });
};

export const config = {
  path: '/api/moderate',
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
