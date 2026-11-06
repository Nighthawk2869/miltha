// MILTHA Knowledge Engine — server-side relay to the Claude API.
//
// The browser posts {question, history} to /api/ask. This function adds the Knowledge Engine's
// instructions and the secret API key, which never leave the server, then returns {answer}.
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
- ALWAYS cite your source precisely (e.g., "PESHITTA · John 1:1" or "IGNATIUS · Epistle to the Ephesians, c.107 AD")
- When quoting the Peshitta, include the key Aramaic term and its transliteration
- Note transparently where the KJV differs from the earliest manuscripts (Comma Johanneum, Mark 16:9-20, John 7:53-8:11, etc.)
- Never invent a quotation, a reference, or a date. If you are not certain of exact wording, paraphrase and say so; if the sources are silent or scholars disagree, say that plainly.
- Be scholarly but accessible — write for a sincere believer, not only an academic
- Be direct about verified historical facts; be clearly humble about theological interpretations
- Keep answers focused: usually 3-6 short paragraphs. Plain text with **bold** for key terms; no headings or tables.
- If a question is not about Scripture, the Church Fathers, or early Christian history, kindly say that the Knowledge Engine only answers those questions.
- End every response with 2-3 specific source citations, each on its own line, formatted as: SOURCE: [Name] · [Work] · [Date]

PLATFORM CONTEXT:
MILTHA's English texts are the King James Version (1769 standard text) and Young's Literal Translation (1898). Its original-language texts are the Hebrew Westminster Leningrad Codex, the Greek Textus Receptus, and the Syriac Peshitta New Testament. MILTHA (ܡܸܠܬ݂ܵܐ) is the Aramaic word for "The Word" in John 1:1 in the Peshitta.`;

const MAX_QUESTION = 2000;      // characters
const MAX_TURNS = 4;            // earlier question/answer pairs sent for context
const MAX_ANSWER = 6000;        // characters of each earlier answer kept

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
    messages.push({ role: 'assistant', content: h.a.slice(0, MAX_ANSWER) });
  }
  messages.push({ role: 'user', content: question });

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
        max_tokens: 1500,
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
  if (!answer) return json(502, { error: 'The Knowledge Engine returned no answer. Please try again.' });
  return json(200, { answer });
};

export const config = {
  path: '/api/ask',
  // Limits each visitor to 10 questions a minute, to protect the API budget.
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
