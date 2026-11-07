// Community posts, shared by /api/posts and /api/moderate.
// Netlify Blobs store "posts", one entry per post: "p/<id>" →
//   {id, uid, name, email, book, ch, from, to, label, verse, text, created, status, replies: [...]}
// status is "pending" (waiting for a moderator), "approved" (public) or "rejected" (hidden).

import { getStore } from '@netlify/blobs';

export const postsStore = () => getStore({ name: 'posts', consistency: 'strong' });
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function allPosts(store, limit = 300) {
  const { blobs } = await store.list({ prefix: 'p/' });
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, limit);   // ids start with the time, so newest first
  const posts = await Promise.all(keys.map((k) => store.get(k, { type: 'json' }).catch(() => null)));
  return posts.filter(Boolean);
}

// What a visitor may see. Members also see their own posts and replies while they wait for approval.
export function publicPost(p, user) {
  const mine = !!user && p.uid === user.id;
  return {
    id: p.id, name: p.name, label: p.label, verse: p.verse, text: p.text, created: p.created,
    href: `study.html#${p.book}/${p.ch}/${p.from}`,
    mine, status: mine ? p.status : undefined,
    replies: (p.replies || []).filter((r) => r.status === 'approved' || (user && r.uid === user.id))
      .map((r) => ({ id: r.id, name: r.name, text: r.text, created: r.created, mine: !!user && r.uid === user.id,
                     status: user && r.uid === user.id ? r.status : undefined })),
  };
}
