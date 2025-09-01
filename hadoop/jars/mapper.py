#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, json, re, unicodedata

STOP = set("""a au aux avec ce cet cette ces ceci cela ca le la les un une des du de d et ou mais donc or ni car
que qui quoi ou quand comment pour par plus moins the of and to in for on at by from with as an a or
is are was were be been this that these those it its if then else than so not no do does did can could
i you he she we they them his her your yours our ours""".split())

def tokens(text):
    text = unicodedata.normalize('NFD', text)
    text = ''.join(ch for ch in text if unicodedata.category(ch) != 'Mn')
    text = re.sub(r'[^a-zA-Z\s]', ' ', text.lower())
    return text.split()

for raw in sys.stdin.buffer:
    line = raw.decode('utf-8', 'ignore')
    try:
        rec = json.loads(line)
    except Exception:
        continue
    text = (rec.get('text') or '').strip()
    if not text:
        continue
    theme = (rec.get('theme') or 'unknown').lower()
    outcome = '1' if bool(rec.get('is_correct')) else '0'
    for tok in tokens(text):
        if len(tok) < 3 or tok in STOP:
            continue
        sys.stdout.write("{}\t{}\t{}\t1\n".format(tok, outcome, theme))
