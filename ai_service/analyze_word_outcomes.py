import sys

path = sys.argv[1] if len(sys.argv) > 1 else "word_counts.tsv"
theme_filter = sys.argv[2] if len(sys.argv) > 2 else "all"

stats = {}  # word -> {"1": cnt, "0": cnt}
with open(path, "r", encoding="utf-8") as f:
    for line in f:
        parts = line.rstrip("\n").split("\t")
        if len(parts) != 4:
            continue
        word, outcome, theme, count = parts[0], parts[1], parts[2], int(parts[3])
        if theme_filter != "all" and theme != theme_filter:
            continue
        d = stats.setdefault(word, {"1": 0, "0": 0})
        d[outcome] += count

rank = []
for w, c in stats.items():
    total = c["1"] + c["0"]
    if total < 5:  # seuil anti-bruit
        continue
    ratio = (c["1"] + 1.0) / (c["0"] + 1.0)  # lissage
    rank.append((ratio, total, c["1"], c["0"], w))

rank.sort(reverse=True)
print("Top 25 pro-succès:")
for r, total, c1, c0, w in rank[:25]:
    print(f"{w}\tratio={r:.2f}\tN={total}\tOK={c1}\tKO={c0}")

rank.sort()
print("\nTop 25 pro-échec:")
for r, total, c1, c0, w in rank[:25]:
    print(f"{w}\tratio={r:.2f}\tN={total}\tOK={c1}\tKO={c0}")
