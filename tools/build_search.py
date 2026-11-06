#!/usr/bin/env python3
"""Build the Knowledge Engine's search file from the Library.

Usage: python3 tools/build_search.py   (after tools/build_library.py)

Writes data/search/fathers.json: [[work id, chapter no., paragraph no., text], ...] with long paragraphs
split at sentence ends into pieces of about 1,200 characters, so each search hit is a quotable passage.
netlify/functions/ask.mjs loads this file once per server instance and searches it for each question.
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LIB = os.path.join(ROOT, 'data', 'library')
OUT = os.path.join(ROOT, 'data', 'search')
MAX = 1200

def pieces(text):
    if len(text) <= MAX * 1.4:
        return [text]
    sentences = re.split(r'(?<=[.!?;:])\s+(?=[“"‘A-Z\[(])', text)
    out, cur = [], ''
    for s in sentences:
        if cur and len(cur) + len(s) > MAX:
            out.append(cur); cur = s
        else:
            cur = (cur + ' ' + s).strip()
    if cur:
        out.append(cur)
    return out

rows = []
index = json.load(open(os.path.join(LIB, 'index.json'), encoding='utf-8'))
for author in index:
    for w in author['works']:
        doc = json.load(open(os.path.join(LIB, w['id'] + '.json'), encoding='utf-8'))
        for ci, c in enumerate(doc['chapters'], 1):
            for pi, p in enumerate(c['p'], 1):
                for piece in pieces(p):
                    rows.append([w['id'], ci, pi, piece])
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'fathers.json'), 'w', encoding='utf-8') as f:
    json.dump(rows, f, ensure_ascii=False, separators=(',', ':'))
print(len(rows), 'passages')
