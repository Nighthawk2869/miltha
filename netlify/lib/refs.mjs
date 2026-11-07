// Bible book names and references ("John 3:16", "1 Cor. 15:3-5") shared by the Netlify Functions.
// Book ids match data/bible (e.g. "1corinthians", "song", "psalms").

export const BOOKS = [
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
export const BOOK_RE = new RegExp('(?<![A-Za-z0-9])(' + ALIASES.map(([n]) => n.replace(/ /g, '\\.?\\s*')).join('|') +
  ')\\.?\\s+(\\d{1,3})\\s*[:.]\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?', 'gi');
export const aliasId = (s) => { const k = s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
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

export const BOOK_IDS = new Set(BOOKS.map(([id]) => id));
