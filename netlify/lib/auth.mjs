// Who is asking? Shared by the member, posts and moderation functions.
//
// Members sign in with Netlify Identity (email + password, email confirmed). The browser sends the
// Identity access token as "Authorization: Bearer <token>"; we ask Identity itself who the token
// belongs to, so a token that is expired, forged or from another site is refused.
//
// Moderators: the email addresses in the MILTHA_ADMINS environment variable (comma separated),
// or any member given the "admin" or "moderator" role in Netlify → Identity (user → Edit settings → Roles).

const ALLOWED_HOST = /^(miltha\.org|www\.miltha\.org|dreamy-puffpuff-7f52f3\.netlify\.app|[a-z0-9-]+--dreamy-puffpuff-7f52f3\.netlify\.app|localhost(:\d+)?)$/;

// Only ever send tokens to this site's own Identity service.
export function siteOrigin(req) {
  const u = new URL(req.url);
  return ALLOWED_HOST.test(u.host) ? u.origin : 'https://miltha.org';
}

const cache = new Map();   // token → {user, until}

export async function currentUser(req) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+([A-Za-z0-9._-]{20,4000})$/);
  if (!m) return null;
  const token = m[1], now = Date.now();
  const hit = cache.get(token);
  if (hit && hit.until > now) return hit.user;

  let u;
  try {
    const r = await fetch(siteOrigin(req) + '/.netlify/identity/user', { headers: { authorization: 'Bearer ' + token } });
    if (!r.ok) return null;
    u = await r.json();
  } catch (e) {
    console.error('Identity check failed', e);
    return null;
  }
  if (!u?.id || !u?.email) return null;

  const admins = (Netlify.env.get('MILTHA_ADMINS') || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
  const email = String(u.email).toLowerCase();
  const user = {
    id: String(u.id),
    email,
    name: cleanName(u.user_metadata?.full_name) || email.split('@')[0],
    admin: admins.includes(email) || (u.app_metadata?.roles || []).some((r) => /^(admin|moderator)s?$/i.test(String(r).trim())),
  };
  if (cache.size > 500) cache.clear();
  cache.set(token, { user, until: now + 60_000 });
  return user;
}

export const cleanName = (s) => typeof s === 'string' ? s.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40) : '';

// Plain text from a visitor: no control characters, tidy line breaks, limited length.
export const cleanText = (s, max) => typeof s === 'string'
  ? s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
  : '';

export const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
