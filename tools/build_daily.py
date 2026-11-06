#!/usr/bin/env python3
"""Build the Daily Word reading plan.

Usage: python3 tools/build_daily.py

Reads tools/daily_plan.txt — 366 lines, one per day of a leap year (line 60 is February 29, which
other years skip; line 360 is December 25) — each "Book ch:v[-v2] | THEME".
Writes data/daily/plan.json: [[book id, chapter, first verse, last verse, theme], ...]
and checks every reference against the KJV verse counts and the original-language texts.
"""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BIBLE = os.path.join(ROOT, 'data', 'bible')
index = json.load(open(os.path.join(BIBLE, 'index.json')))
NAMES = {'psalm': 'psalms', 'song of solomon': 'song'}

def book_id(name):
    n = name.lower()
    n = NAMES.get(n, n)
    return n.replace(' ', '')

plan, problems, notes = [], [], []
lines = [l for l in open(os.path.join(ROOT, 'tools', 'daily_plan.txt'), encoding='utf-8').read().split('\n') if l.strip()]
if len(lines) != 366:
    problems.append(f'plan has {len(lines)} lines, needs 366')
cache = {}
def text(t, b):
    if (t, b) not in cache:
        p = os.path.join(BIBLE, t, b + '.json')
        cache[(t, b)] = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None
    return cache[(t, b)]

for n, line in enumerate(lines, 1):
    ref, theme = [x.strip() for x in line.split('|')]
    m = re.match(r'^(.+?) (\d+):(\d+)(?:-(\d+))?$', ref)
    if not m:
        problems.append(f'{n}: cannot read "{ref}"'); continue
    b, c, v1 = book_id(m.group(1)), int(m.group(2)), int(m.group(3))
    v2 = int(m.group(4) or v1)
    if b not in index:
        problems.append(f'{n}: unknown book "{m.group(1)}"'); continue
    counts = index[b]['kjv']
    if c > len(counts) or v2 > counts[c - 1] or v1 > v2:
        problems.append(f'{n}: {ref} is not in the KJV'); continue
    ot = 'heb' in index[b]
    for t in (['kjv', 'ara', 'lxx'] if ot else ['kjv', 'gk', 'ara']):
        d = text(t, b)
        if d is None or not all(d[c - 1][v - 1] for v in range(v1, v2 + 1)):
            if t == 'lxx':
                notes.append(f'{n}: {ref} is not in the Septuagint (shown as such on the page)')
            else:
                problems.append(f'{n}: {ref} has no {t} text')
    plan.append([b, c, v1, v2, theme])

with open(os.path.join(ROOT, 'data', 'daily', 'plan.json'), 'w', encoding='utf-8') as f:
    json.dump(plan, f, ensure_ascii=False, separators=(',', ':'))
print(len(plan), 'days;', 'problems:' if problems else 'no problems', *problems, *notes, sep='\n  ')
sys.exit(1 if problems else 0)
