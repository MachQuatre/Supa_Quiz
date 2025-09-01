import math
import json
import numpy as np
from typing import Dict, Any
from recommender import Recommender

EPS = 1e-9

def dkt_holdout_metrics(user_id: str) -> Dict[str, Any]:
    """
    Walk-forward: à chaque interaction t, on prédit p(correct_t) à partir de l'historique < t.
    Retourne des métriques standard: logloss, brier, accuracy.
    """
    rec = Recommender()
    rec._load_dkt()
    seq = rec._user_sequence_for_dkt(user_id)  # [(skill_idx, correct)]
    K = rec._dkt_meta["num_skills"]
    if len(seq) < 3:
        return {"user_id": user_id, "n": 0, "message": "séquence trop courte"}

    preds, trues = [], []
    for t in range(1, len(seq)):
        # build prefix [0..t-1] pour prédire sur l'item à t
        prefix = seq[:t]
        p_vec = rec._dkt_predict_vector(prefix)  # taille K
        s_t, c_t = seq[t]
        preds.append(float(p_vec[s_t]))
        trues.append(float(c_t))

    y = np.array(trues, dtype=np.float64)
    p = np.clip(np.array(preds, dtype=np.float64), EPS, 1 - EPS)

    logloss = float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
    brier   = float(np.mean((p - y) ** 2))
    acc     = float(np.mean((p >= 0.5) == (y == 1.0)))
    sweet   = float(np.mean((p >= 0.55) & (p <= 0.75)))

    return {
        "user_id": user_id,
        "n": int(len(y)),
        "logloss": round(logloss, 4),
        "brier": round(brier, 4),
        "accuracy@0.5": round(acc, 4),
        "pct_in_0.55_0.75": round(sweet, 4)
    }

def summarize_with_dkt_p(rec: Recommender, user_id: str, items):
    """Calcule p(correct) (via DKT) pour une liste d'items, + diversité par thème."""
    rec._load_dkt()
    seq = rec._user_sequence_for_dkt(user_id)
    p_vec = rec._dkt_predict_vector(seq)
    idx_of = rec._dkt_meta["skill2idx"]
    ps = []
    themes = set()
    for q in items:
        key = f"{q['theme']}|||{q['difficulty']}"
        if key in idx_of:
            ps.append(float(p_vec[idx_of[key]]))
        themes.add(q.get("theme"))
    arr = np.array(ps) if ps else np.array([])
    if arr.size == 0:
        return {"avg_p": None, "pct_0.55_0.75": None, "n": 0, "themes": 0}
    return {
        "avg_p": round(float(arr.mean()), 4),
        "pct_0.55_0.75": round(float(((arr >= 0.55) & (arr <= 0.75)).mean()), 4),
        "n": int(arr.size),
        "themes": int(len(themes))
    }
