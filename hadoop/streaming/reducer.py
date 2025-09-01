#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys

cur_key, cur_sum = None, 0

for raw in sys.stdin.buffer:
    line = raw.decode('utf-8', 'ignore').rstrip('\n')
    parts = line.split('\t')
    if len(parts) != 4:
        continue
    key = '\t'.join(parts[:3])  # word, outcome, theme
    try:
        val = int(parts[3])
    except Exception:
        continue
    if cur_key is not None and key != cur_key:
        sys.stdout.write("{}\t{}\n".format(cur_key, cur_sum))
        cur_sum = 0
    cur_key = key
    cur_sum += val

if cur_key is not None:
    sys.stdout.write("{}\t{}\n".format(cur_key, cur_sum))
