# The Library: writings of the early Church Fathers

Built by `tools/build_library.py` from two public-domain translations, using the XML editions
published by the Christian Classics Ethereal Library (CCEL), which mark both as Public Domain:

| Source | Used for |
|---|---|
| J. B. Lightfoot & J. R. Harmer, *The Apostolic Fathers* (1891) — ccel.org/ccel/lightfoot/fathers | 1 Clement, the Didache, the seven letters of Ignatius, Polycarp to the Philippians, the Martyrdom of Polycarp, the Epistle to Diognetus |
| A. Roberts, J. Donaldson & A. C. Coxe (eds.), *Ante-Nicene Fathers*, vols. I–IV (1885–87) — ccel.org/ccel/schaff | Justin Martyr, Irenaeus, Clement of Alexandria, Tertullian |

Lightfoot is used for Ignatius because it gives only the seven genuine letters; the 1885 edition
interleaves them with a later expanded version.

Only the authors' own words are kept. Left out: the editors' introductions, footnotes, notes and
"elucidations"; translator credit lines; the three imperial letters appended to Justin's First Apology;
the fragments appendix after Clement's Stromata.

Files: `index.json` (authors → works → chapter titles, word counts) and one `<work-id>.json` per work:
`{"id", "title", "author", "date", "source", "chapters": [{"t": chapter title, "p": [paragraph, ...]}]}`.
