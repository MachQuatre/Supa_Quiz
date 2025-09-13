import os
import random
import datetime as dt
from typing import List, Dict, Any
from pymongo import MongoClient
import json
import torch
import numpy as np
from models.dkt import DKT

# ----------------------- Config -----------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME_ENV = os.getenv("MONGO_DB", "").strip()
WINDOW = int(os.getenv("ANALYSIS_WINDOW_DAYS", "7"))  # fenêtre “récent” en jours

# ----------------------- Connexion DB (robuste) -----------------------
def _connect_db():
    """
    Retourne (client, db) en gérant les 3 cas:
      1) MONGO_DB non vide  -> utilise ce nom
      2) MONGO_URI avec /db -> utilise client.get_default_database()
      3) fallback           -> 'quiz_app'
    """
    client = MongoClient(MONGO_URI)
    if DB_NAME_ENV:
        return client, client[DB_NAME_ENV]
    try:
        db = client.get_default_database()
        if db is not None:
            return client, db
    except Exception:
        pass
    return client, client["quiz_app"]

# ----------------------- Helpers -----------------------
def _as_dt(x):
    """Parse des dates hétérogènes en datetime (UTC) ou None."""
    if isinstance(x, dt.datetime):
        return x
    if x is None:
        return None
    s = str(x)
    try:
        return dt.datetime.fromisoformat(s.replace("Z", ""))
    except Exception:
        return None

def _norm_bool(v) -> bool:
    """Convertit diverses représentations en booléen."""
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return v != 0
    return str(v).strip().lower() in ("1", "true", "yes", "ok", "correct", "vrai")

def _normalize_event(doc: Dict[str, Any], qp: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Normalise un événement d'historique utilisateur sur un format unique :
    { theme, difficulty, question_id, correct, response_time_ms, ts }

    - doc : document de la collection usersessions
    - qp  : item de questions_played (mode Game/Kahoot) OU None (mode Training léger)
    """
    theme = doc.get("theme")
    difficulty = doc.get("difficulty")
    ts = doc.get("createdAt") or doc.get("end_time") or doc.get("start_time")

    if qp is not None:
        # Mode Game/Kahoot : info portée par le sous-doc
        qid = qp.get("question_id")
        corr = qp.get("is_correct")
        rt = qp.get("response_time_ms")
        theme = qp.get("theme") or theme
    else:
        # Mode Training (événement léger)
        qid = doc.get("question_id")
        corr = doc.get("correct")
        rt = doc.get("response_time_ms")

    return {
        "theme": theme,
        "difficulty": difficulty,
        "question_id": qid,
        "correct": _norm_bool(corr),
        "response_time_ms": (rt if isinstance(rt, (int, float)) else None),
        "ts": _as_dt(ts),
    }

def iter_user_history(db, user_id: str):
    """
    Itère l'historique fusionné de l'utilisateur :
      - sessions complètes avec questions_played[] (Game/Kahoot)
      - événements 'training' légers (user-sessions/record)
    """
    coll = db["usersessions"]
    cur = coll.find(
        {"user_id": str(user_id)},
        {
            "theme": 1, "difficulty": 1,
            "question_id": 1, "correct": 1, "response_time_ms": 1,
            "questions_played": 1,
            "createdAt": 1, "end_time": 1, "start_time": 1,
            "source": 1,
        },
    )
    for doc in cur:
        qps = doc.get("questions_played") or []
        if qps:
            for qp in qps:
                yield _normalize_event(doc, qp=qp)
        else:
            if doc.get("question_id"):
                yield _normalize_event(doc, qp=None)

def _all_seen_question_ids(db, user_id: str) -> set:
    """Toutes les questions vues (Game + Training)."""
    seen = set()
    for ev in iter_user_history(db, user_id):
        if ev.get("question_id"):
            seen.add(ev["question_id"])
    return seen

def _recent_seen_question_ids(db, user_id: str, last_events: int = 20) -> set:
    """Questions vues sur les N derniers événements (Game + Training)."""
    events = list(iter_user_history(db, user_id))
    events.sort(key=lambda e: (e["ts"] or dt.datetime.min), reverse=True)
    s = set()
    for ev in events[:last_events]:
        if ev.get("question_id"):
            s.add(ev["question_id"])
    return s

def _recent_mastered_question_ids(db, user_id: str, correct_min: int = 2, window_events: int = 6) -> set:
    """
    Questions répondues correctement au moins `correct_min` fois
    sur les `window_events` derniers événements (Game + Training).
    => On les considère ‘maîtrisées récemment’ et on les exclut.
    """
    events = list(iter_user_history(db, user_id))
    events.sort(key=lambda e: (e.get("ts") or dt.datetime.min), reverse=True)
    counts = {}
    for ev in events[:window_events]:
        qid = ev.get("question_id")
        if not qid:
            continue
        if ev.get("correct") is True:
            counts[qid] = counts.get(qid, 0) + 1
    return {qid for qid, c in counts.items() if c >= correct_min}

def _diversify(items, max_per_theme: int = 2):
    """Ré-ordonne/filtre pour éviter 5 items du même thème à la suite."""
    out, count = [], {}
    for q in items:
        t = q.get("theme", "?")
        if count.get(t, 0) < max_per_theme:
            out.append(q)
            count[t] = count.get(t, 0) + 1
    # si on a trop peu d’items, on complète avec le reste
    if len(out) < len(items):
        for q in items:
            if q not in out:
                out.append(q)
                if len(out) >= len(items):
                    break
    return out

# ----------------------- Recommender -----------------------
class Recommender:
    """
    Lit directement MongoDB (mêmes collections que le backend Node).
    Désormais, les statistiques et la 'seen list' tiennent compte :
      - des sessions complètes (questions_played[])
      - des événements d'entraînement (question_id, correct, response_time_ms)
    """

    def __init__(self):
        self.client, self.db = _connect_db()

    # ----------------- ANALYSE PAR THEME -----------------
    def user_theme_stats(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Taux de réussite, nb d’essais, temps moyen, et tendance récente par thème.
        Basé sur l'historique fusionné (Game + Training).

        Tendance = delta du taux de réussite entre
          - fenêtre récente: [now - WINDOW, now]
          - fenêtre précédente: ]now - 2*WINDOW, now - WINDOW]
        """
        now = dt.datetime.utcnow()
        recent_from = now - dt.timedelta(days=WINDOW)
        prev_from   = now - dt.timedelta(days=2 * WINDOW)
        prev_to     = recent_from

        evs = list(iter_user_history(self.db, user_id))

        g_attempts, g_correct, g_time = {}, {}, {}
        r_attempts, r_correct = {}, {}
        p_attempts, p_correct = {}, {}

        for e in evs:
            theme = e.get("theme")
            if not theme:
                continue
            ts = e.get("ts") or now
            corr = bool(e.get("correct", False))
            rt = e.get("response_time_ms")

            # Global
            g_attempts[theme] = g_attempts.get(theme, 0) + 1
            if corr:
                g_correct[theme] = g_correct.get(theme, 0) + 1
            if isinstance(rt, (int, float)):
                g_time[theme] = g_time.get(theme, 0.0) + float(rt)

            # Récente
            if recent_from <= ts <= now:
                r_attempts[theme] = r_attempts.get(theme, 0) + 1
                if corr:
                    r_correct[theme] = r_correct.get(theme, 0) + 1

            # Précédente
            if prev_from < ts <= prev_to:
                p_attempts[theme] = p_attempts.get(theme, 0) + 1
                if corr:
                    p_correct[theme] = p_correct.get(theme, 0) + 1

        themes = set(g_attempts.keys()) | set(r_attempts.keys()) | set(p_attempts.keys())
        out = []
        for t in themes:
            attempts = int(g_attempts.get(t, 0))
            correct  = int(g_correct.get(t, 0))
            avg_time = (g_time.get(t, 0.0) / attempts) if attempts > 0 else 0.0
            sr = (correct / attempts) if attempts > 0 else 0.0

            attempts_r = int(r_attempts.get(t, 0))
            correct_r  = int(r_correct.get(t, 0))
            sr_recent  = (attempts_r and (correct_r / attempts_r)) or None

            attempts_p = int(p_attempts.get(t, 0))
            correct_p  = int(p_correct.get(t, 0))
            sr_prev    = (attempts_p and (correct_p / attempts_p)) or None

            trend = None
            if sr_recent is not None and sr_prev is not None:
                trend = float(sr_recent) - float(sr_prev)

            # “maîtrise” simple : combine précision et temps (borne 10s)
            time_factor = 1.0
            if avg_time > 0:
                time_factor = max(0.3, min(1.0, 10000.0 / avg_time))
            mastery = 0.7 * sr + 0.3 * sr * time_factor

            out.append({
                "theme": t,
                "attempts": attempts,
                "correct": correct,
                "success_rate": round(float(sr), 4),
                "avg_time_ms": round(float(avg_time), 1) if avg_time else None,
                "success_rate_recent": round(float(sr_recent), 4) if sr_recent is not None else None,
                "success_rate_prev":   round(float(sr_prev), 4)   if sr_prev is not None else None,
                "trend_delta": round(float(trend), 4) if trend is not None else None,
                "mastery": round(float(mastery), 4),
            })

        # ordonner : plus faible maîtrise en premier, puis plus faible succès récent
        out.sort(key=lambda x: (x["mastery"], x["success_rate_recent"] or 1.0, x["attempts"]))
        return out

    # ----------------- DIFFICULTÉ CIBLE -----------------
    @staticmethod
    def target_difficulty(mastery: float) -> str:
        if mastery < 0.4:
            return "facile"
        elif mastery < 0.7:
            return "moyen"
        return "difficile"

    # ----------------- RECOMMANDATIONS (heuristiques) ------------------
    def recommended_questions(self, user_id: str, limit: int = 10, mix_ratio: float = 0.5) -> List[Dict[str, Any]]:
        """
        mix_ratio ~ proportion de 'révision' vs 'challenge' (0.5 = 50/50)
        - Révision: cible la difficulté adaptée au niveau courant
        - Challenge: un cran au-dessus si dispo
        - Exclut les questions déjà vues (Game + Training)
        - Exclut les questions maîtrisées récemment (>= 2 bonnes réponses parmi les 6 derniers events)
        - Évite 'cold_start' si l'utilisateur a déjà de l'historique
        """
        stats = self.user_theme_stats(user_id)
        theme_by_name = {s["theme"]: s for s in stats}
        ordered_themes = list(theme_by_name.keys())

        # Construire l'ensemble des questions à exclure
        seen = _all_seen_question_ids(self.db, user_id)
        seen |= _recent_mastered_question_ids(self.db, user_id, correct_min=2, window_events=6)
        recent_seen = _recent_seen_question_ids(self.db, user_id, last_events=20)
        seen |= recent_seen  # anti-répétition courte

        pool_revision, pool_challenge = [], []

        def harder(d: str) -> str:
            return {"facile": "moyen", "moyen": "difficile"}.get(d, "difficile")

        for theme in ordered_themes:
            st = theme_by_name[theme]
            mastery = st["mastery"]
            diff = self.target_difficulty(mastery)

            # Révision (diff courante)
            for q in self.db.questions.find({
                "theme": theme,
                "difficulty": diff,
                "question_id": {"$nin": list(seen)},
            }, {"_id": 0}):
                q = dict(q)
                q["reason_type"] = "revision"
                q["reason"] = f"Thème {theme} faiblement maîtrisé (mastery={mastery:.2f}). Révision en {diff}."
                q["theme_mastery"] = round(mastery, 4)
                q["target_difficulty"] = diff
                pool_revision.append(q)

            # Challenge (cran au-dessus)
            hd = harder(diff)
            for q in self.db.questions.find({
                "theme": theme,
                "difficulty": hd,
                "question_id": {"$nin": list(seen)},
            }, {"_id": 0}):
                q = dict(q)
                q["reason_type"] = "challenge"
                q["reason"] = f"Progression sur {theme}. Challenge en {hd}."
                q["theme_mastery"] = round(mastery, 4)
                q["target_difficulty"] = hd
                pool_challenge.append(q)

        # Cas de repli : aucune question en révision/challenge
        if not pool_revision and not pool_challenge:
            # Si l'utilisateur a déjà un historique, éviter 'cold_start'
            has_history = len(seen) > 0
            base_query = {"difficulty": "facile"}
            if has_history:
                played_themes = {e.get("theme") for e in iter_user_history(self.db, user_id) if e.get("theme")}
                if played_themes:
                    base_query = {"difficulty": "facile", "theme": {"$in": list(played_themes)}}

            tmp = [q for q in self.db.questions.find(base_query, {"_id": 0}) if q["question_id"] not in seen]
            random.shuffle(tmp)
            for q in tmp[:limit]:
                if has_history:
                    q["reason_type"] = "revision"
                    q["reason"] = "Révision douce sur vos thèmes joués."
                else:
                    q["reason_type"] = "cold_start"
                    q["reason"] = "Nouveau joueur : démarrage en facile."
                q["theme_mastery"] = None
                q["target_difficulty"] = "facile"
            return tmp[:limit]

        random.shuffle(pool_revision)
        random.shuffle(pool_challenge)

        k_rev = int(round(limit * mix_ratio))
        k_ch  = limit - k_rev
        recos = pool_revision[:k_rev] + pool_challenge[:k_ch]

        if len(recos) < limit:
            missing = limit - len(recos)
            extra = list(self.db.questions.find(
                {"question_id": {"$nin": list(seen)}},
                {"_id": 0}
            ).limit(missing * 2))
            random.shuffle(extra)
            for q in extra:
                q["reason_type"] = "fill"
                q["reason"] = "Complément de panier."
                q["theme_mastery"] = None
                q["target_difficulty"] = q.get("difficulty")
            recos += extra[:missing]

        # Dédoublonnage — garder la 1ère occurrence
        uniq = {}
        for q in recos:
            qid = q["question_id"]
            if qid not in uniq:
                uniq[qid] = q
        recos = list(uniq.values())

        # Diversité par thème
        recos = _diversify(recos, max_per_theme=2)
        return recos[:limit]

    # ----------------- DKT ------------------
    _dkt_loaded = False
    _dkt_model = None
    _dkt_meta = None

    def _load_dkt(self):
        if self._dkt_loaded:
            return
        model_dir = os.getenv("MODEL_DIR", "model")
        meta_path = os.path.join(model_dir, "dkt_meta.json")
        model_path = os.path.join(model_dir, "dkt.pt")
        if not (os.path.exists(meta_path) and os.path.exists(model_path)):
            raise RuntimeError("DKT model not trained yet. Call /train/dkt first.")
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        model = DKT(num_skills=meta["num_skills"])
        state = torch.load(model_path, map_location="cpu")
        model.load_state_dict(state)
        model.eval()
        self._dkt_model = model
        self._dkt_meta = meta
        self._dkt_loaded = True

    def _user_sequence_for_dkt(self, user_id: str):
        """
        Construit la séquence utilisateur [(skill_idx, correct)] triée par temps.
        Basée sur la collection responses (flux Game), comme avant.
        """
        meta = self._dkt_meta
        skill2idx = meta["skill2idx"]
        pipeline = [
            {"$lookup": { "from": "usersessions", "localField": "session_id", "foreignField": "user_session_id", "as": "us" }},
            {"$unwind": "$us"},
            {"$match": {"us.user_id": user_id}},
            {"$lookup": { "from": "questions", "localField": "question_id", "foreignField": "question_id", "as": "q" }},
            {"$unwind": "$q"},
            {"$project": {"answered_at": 1, "is_correct": 1, "theme": "$q.theme", "difficulty": "$q.difficulty"}},
            {"$sort": {"answered_at": 1}}
        ]
        seq = []
        for r in self.db.responses.aggregate(pipeline):
            key = f"{r['theme']}|||{r['difficulty']}"
            if key not in skill2idx:
                continue
            seq.append((skill2idx[key], 1 if r.get("is_correct") else 0))
        return seq

    def _dkt_predict_vector(self, seq):
        """
        Given a user sequence, return vector p(correct) for next step for all skills (size K).
        If no history, return uniform 0.6 baseline.
        """
        K = self._dkt_meta["num_skills"]
        if len(seq) < 1:
            return np.full(K, 0.6, dtype=np.float32)

        # Build X of shape [1, T, 2K]
        T = len(seq)
        x = np.zeros((1, T, 2*K), dtype=np.float32)
        for t in range(T):
            s, c = seq[t]
            if c == 1:
                x[0, t, s] = 1.0
            else:
                x[0, t, K + s] = 1.0
        x = torch.from_numpy(x)
        with torch.no_grad():
            yhat = self._dkt_model(x)   # [1, T, K]
            p = yhat[0, -1, :].detach().cpu().numpy()  # last time step
        return p

    def recommended_questions_dkt(self, user_id: str, limit: int = 10, mix_ratio: float = 0.5):
        """
        Recommande en maximisant l'apprentissage : viser p(correct) ≈ 0.6–0.7.
        On construit deux paniers:
          - revision: proche de 0.70
          - challenge: proche de 0.55
        """
        self._load_dkt()

        # Questions déjà vues (fusion : responses + training)
        seen = _all_seen_question_ids(self.db, user_id)

        seq = self._user_sequence_for_dkt(user_id)
        p_vec = self._dkt_predict_vector(seq)  # size K

        K = self._dkt_meta["num_skills"]
        idx_of = self._dkt_meta["skill2idx"]  # str->idx

        def target_score(p, target):
            # plus proche du target => meilleur score
            return -float((p - target) ** 2)

        target_rev = 0.70
        target_ch  = 0.55
        rev_pool, ch_pool = [], []

        # Parcourir questions candidates (non vues)
        cursor = self.db.questions.find({}, {"_id": 0})
        for q in cursor:
            qid = q["question_id"]
            if qid in seen:
                continue
            key = f"{q['theme']}|||{q['difficulty']}"
            if key not in idx_of:
                continue
            sidx = idx_of[key]
            p = float(p_vec[sidx])

            q_rev = dict(q)
            q_rev["reason_type"] = "revision"
            q_rev["reason"] = f"DKT: p(correct)≈{p:.2f}, proche cible 0.70"
            q_rev["target_difficulty"] = q["difficulty"]
            q_rev["_score"] = target_score(p, target_rev)
            rev_pool.append(q_rev)

            q_ch = dict(q)
            q_ch["reason_type"] = "challenge"
            q_ch["reason"] = f"DKT: p(correct)≈{p:.2f}, proche cible 0.55"
            q_ch["target_difficulty"] = q["difficulty"]
            q_ch["_score"] = target_score(p, target_ch)
            ch_pool.append(q_ch)

        rev_pool.sort(key=lambda x: x["_score"], reverse=True)
        ch_pool.sort(key=lambda x: x["_score"], reverse=True)

        k_rev = int(round(limit * mix_ratio))
        k_ch  = limit - k_rev
        items = rev_pool[:k_rev] + ch_pool[:k_ch]

        # Dédoublonnage par question_id, garder meilleur score
        best = {}
        for it in items:
            qid = it["question_id"]
            if qid not in best or it["_score"] > best[qid]["_score"]:
                best[qid] = it
        items = list(best.values())
        items.sort(key=lambda x: x["_score"], reverse=True)
        for it in items:
            it.pop("_score", None)
        return items[:limit]
