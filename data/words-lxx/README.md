# Septuagint words (Word by Word)

Built by `tools/build_lxx_words.py`. Licensed **CC BY-SA 4.0**, like its sources.

- **Text:** H. B. Swete, *The Old Testament in Greek according to the Septuagint* (1909–1930), transcribed by the
  First1KGreek / Open Greek and Latin project — CC BY-SA 4.0.
- **Words, grammar and dictionary forms:** [QuantForgeSoftware/lxx](https://github.com/QuantForgeSoftware/lxx),
  Swete's text analysed by the Morpheus parser — CC BY-SA 4.0. Machine-tagged.
- **Changes made here:** every word form that also occurs in the Greek New Testament and is (nearly) always the same
  word there takes its dictionary entry, grammar and (for pronouns) English from
  [STEPBible's TAGNT](https://github.com/STEPBible/STEPBible-Data) (Tyndale House, CC BY 4.0); elided and
  variant dictionary forms are normalised; nouns and adjectives take their case and number from a preceding article;
  verses are renumbered to the KJV with STEPBible's TVTMS. English meanings come from STEPBible's TBESG.
- Grammar codes starting `M:` are the computer's (described in `grammar.json`); other codes were checked against
  the New Testament (described in `../words/grammar-gk.json`).

Files: `<book>/<chapter>.json` = `{"<KJV verse>": [[word, lemma index, grammar code], …]}`;
`lemmas.json` = `[[dictionary form, Strong's or "", English], …]`.
