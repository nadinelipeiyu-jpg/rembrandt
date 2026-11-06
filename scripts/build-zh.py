#!/usr/bin/env python3
"""Builds src/zh-tw.js (the Traditional Chinese interface layer) from translations/zh-TW.json.

translations/zh-TW.json maps each English on-screen string to its Chinese text. `{0}`, `{1}`, ...
stand for values the app fills in at runtime (numbers, names). Run from the repository root:

    python3 scripts/build-zh.py
"""
import json, re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
table = json.loads((root / 'translations' / 'zh-TW.json').read_text(encoding='utf8'))
template = (root / 'translations' / 'zh-runtime.js').read_text(encoding='utf8')

norm = lambda s: re.sub(r'\s+', ' ', s).strip()
exact, patterns = {}, {}

def put(en, zh):
    en, zh = norm(en), zh.strip()
    if not en or not zh or en == zh:
        return
    if re.search(r'\{\d+\}', en):
        letters = len(re.findall(r'[A-Za-z]', re.sub(r'\{\d+\}', '', en)))
        if letters < 2:
            return  # too little fixed text to recognise safely
        # With very little fixed text ("{0} to {1}"), every value must itself be a known string.
        patterns.setdefault(en, [zh, letters < 4])
    else:
        exact.setdefault(en, zh)

for en, zh in table.items():
    if not zh:
        continue
    put(en, zh)
    # Fragments glued on with " · " also show up on their own.
    if norm(en).startswith('· '):
        put(norm(en)[2:], re.sub(r'^\s*·\s*', '', zh))
    if norm(en).endswith(' ·'):
        put(norm(en)[:-2], re.sub(r'\s*·\s*$', '', zh))

# Most specific first: more fixed text wins.
ordered = [[en, zh, strict] for en, (zh, strict) in sorted(patterns.items(), key=lambda kv: -len(re.sub(r'\{\d+\}', '', kv[0])))]
js = template.replace('__EXACT__', json.dumps(exact, ensure_ascii=False, separators=(',', ':'))) \
             .replace('__PATTERNS__', json.dumps(ordered, ensure_ascii=False, separators=(',', ':')))
(root / 'src' / 'zh-tw.js').write_text(js, encoding='utf8')
print(f'src/zh-tw.js: {len(exact)} strings, {len(ordered)} patterns', file=sys.stderr)
