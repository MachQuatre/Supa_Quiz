import os
import random
import datetime as dt
from typing import List, Dict, Any
from pymongo import MongoClient
import json
import torch
import numpy as np
from models.dkt import DKT
import datetime as dt


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME   = os.getenv("MONGO_DB", "quiz_app")
WINDOW    = int(os.getenv("ANALYSIS_WINDOW_DAYS", "7"))

def _recent_seen_question_ids(db, user_id: str, last_sessions: int = 3):
    """Exclut les questions vues dans les N dernières sessions."""
    # récupérer N dernières sessions
    sessions = list(db.usersessions.find(
        {"user_id": user_id},
        {"_id": 0, "user_session_id": 1, "started_at": 1}
    ).sort("started_at", -1).limit(last_sessions))
    sids = [s["user_session_id"] for s in sessions]
    seen = set()
    if sids:
        for r in db.responses.find({"session_id": {"$in": sids}}, {"_id":0,"question_id":1}):
            if r.get("question_id"): seen.add(r["question_id"])
    return seen

def _diversify(items, max_per_theme: int = 2):
    """Ré-ordonne/filtre pour éviter 5 items du même thème à la suite."""
    out, count = [], {}
    for q in items:
        t = q.get("theme","?")
        if count.get(t,0) < max_per_theme:
            out.append(q)
            count[t] = count.get(t,0)+1
    # si on a trop peu d'items, on complète avec le reste
    if len(out) < len(items):
        for q in items:
            if q not in out:
                out.append(q)
                if len(out) >= len(items): break
    return out

class Recommender:
    """
    Lit directement MongoDB (mêmes collections que le backend Node) :
      - questions    : {question_id, theme, difficulty}
      - usersessions : {user_session_id, user_id, started_at}
      - responses    : {session_id, question_id, is_correct, response_time, answered_at}
    Jointure : responses.session_id -> usersessions.user_session_id
    """

    def __init__(self):
        self.client = MongoClient(MONGO_URI)
        self.db = self.client[DB_NAME]

    # ----------------- ANALYSE PAR THEME -----------------
    def user_theme_stats(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Taux de réussite, nb d’essais, temps moyen, et tendance récente par thème.
        Tendance = delta du taux de réussite entre
          - fenêtre récente: [now - WINDOW, now]
          - fenêtre précédente: ]now - 2*WINDOW, now - WINDOW]
        """
        now = dt.datetime.utcnow()
        recent_from = now - dt.timedelta(days=WINDOW)
        prev_from   = now - dt.timedelta(days=2*WINDOW)
        prev_to     = recent_from

        # pipeline de base: join user + join question
        base_lookup = [
            {"$lookup": {
                "from": "usersessions",
                "localField": "session_id",
                "foreignField": "user_session_id",
                "as": "us"
            }},
            {"$unwind": "$us"},
            {"$match": {"us.user_id": user_id}},
            {"$lookup": {
                "from": "questions",
                "localField": "question_id",
                "foreignField": "question_id",
                "as": "q"
            }},
            {"$unwind": "$q"},
        ]

        # Global (tout l’historique) -> base pour attempts/avg_time/success_rate
        global_pipe = base_lookup + [
            {"$group": {
                "_id": "$q.theme",
                "attempts": {"$sum": 1},
                "correct":  {"$sum": {"$cond": ["$is_correct", 1, 0]}},
                "avg_time_ms": {"$avg": "$response_time"}
            }},
            {"$project": {
                "_id": 0,
                "theme": "$_id",
                "attempts": 1,
                "correct": 1,
                "success_rate": {
                    "$cond": [
                        {"$gt": ["$attempts", 0]},
                        {"$divide": ["$correct", "$attempts"]},
                        0
                    ]
                },
                "avg_time_ms": 1
            }}
        ]

        # Fenêtre récente
        recent_pipe = base_lookup + [
            {"$match": {"answered_at": {"$gte": recent_from, "$lte": now}}},
            {"$group": {
                "_id": "$q.theme",
                "attempts_recent": {"$sum": 1},
                "correct_recent":  {"$sum": {"$cond": ["$is_correct", 1, 0]}}
            }},
            {"$project": {
                "_id": 0,
                "theme": "$_id",
                "success_rate_recent": {
                    "$cond": [
                        {"$gt": ["$attempts_recent", 0]},
                        {"$divide": ["$correct_recent", "$attempts_recent"]},
                        None
                    ]
                }
            }}
        ]

        # Fenêtre précédente
        prev_pipe = base_lookup + [
            {"$match": {"answered_at": {"$gt": prev_from, "$lte": prev_to}}},
            {"$group": {
                "_id": "$q.theme",
                "attempts_prev": {"$sum": 1},
                "correct_prev":  {"$sum": {"$cond": ["$is_correct", 1, 0]}}
            }},
            {"$project": {
                "_id": 0,
                "theme": "$_id",
                "success_rate_prev": {
                    "$cond": [
                        {"$gt": ["$attempts_prev", 0]},
                        {"$divide": ["$correct_prev", "$attempts_prev"]},
                        None
                    ]
                }
            }}
        ]

        global_stats = {d["theme"]: d for d in self.db.responses.aggregate(global_pipe)}
        recent_stats = {d["theme"]: d for d in self.db.responses.aggregate(recent_pipe)}
        prev_stats   = {d["theme"]: d for d in self.db.responses.aggregate(prev_pipe)}

        # merge
        themes = set(global_stats) | set(recent_stats) | set(prev_stats)
        out = []
        for t in themes:
            g = global_stats.get(t, {})
            r = recent_stats.get(t, {})
            p = prev_stats.get(t, {})

            sr_recent = r.get("success_rate_recent")
            sr_prev   = p.get("success_rate_prev")

            # tendance = recent - prev (si les deux existent), sinon None
            trend = None
            if sr_recent is not None and sr_prev is not None:
                trend = float(sr_recent) - float(sr_prev)

            # “maîtrise” = combiner précision globale et temps moyen (simple)
            sr = float(g.get("success_rate", 0.0))
            avg_time = float(g.get("avg_time_ms", 0.0) or 0.0)
            time_factor = 1.0
            if avg_time > 0:
                # 10s ~ 10000ms ; borne à [0.3, 1.0]
                time_factor = max(0.3, min(1.0, 10000.0 / avg_time))
            mastery = 0.7 * sr + 0.3 * sr * time_factor

            out.append({
                "theme": t,
                "attempts": int(g.get("attempts", 0)),
                "correct": int(g.get("correct", 0)),
                "success_rate": round(sr, 4),
                "avg_time_ms": round(avg_time, 1) if avg_time else None,
                "success_rate_recent": round(sr_recent, 4) if sr_recent is not None else None,
                "success_rate_prev":   round(sr_prev, 4) if sr_prev is not None else None,
                "trend_delta": round(trend, 4) if trend is not None else None,
                "mastery": round(mastery, 4),
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

    # ----------------- RECOMMANDATIONS ------------------
    def recommended_questions(self, user_id: str, limit: int = 10, mix_ratio: float = 0.5) -> List[Dict[str, Any]]:
        """
        mix_ratio ~ proportion de 'révision' vs 'challenge' (0.5 = 50/50)
        - Révision: cible la difficulté adaptée au niveau courant
        - Challenge: un cran au-dessus si dispo
        - Exclut les questions déjà vues
        """
        stats = self.user_theme_stats(user_id)
        theme_by_name = {s["theme"]: s for s in stats}
        ordered_themes = list(theme_by_name.keys())

        # Construire l'ensemble des questions vues
        seen = set()
        seen_pipe = [
            {"$lookup": {
                "from": "usersessions",
                "localField": "session_id",
                "foreignField": "user_session_id",
                "as": "us"
            }},
            {"$unwind": "$us"},
            {"$match": {"us.user_id": user_id}},
            {"$group": {"_id": "$question_id"}}
        ]
        for r in self.db.responses.aggregate(seen_pipe):
            if r["_id"]:
                seen.add(r["_id"])

        # --- après avoir calculé: stats/theme_by_name/ordered_themes/seen ... ---

        pool_revision = []
        pool_challenge = []

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
                "question_id": {"$nin": list(seen)}
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
                "question_id": {"$nin": list(seen)}
            }, {"_id": 0}):
                q = dict(q)
                q["reason_type"] = "challenge"
                q["reason"] = f"Progression sur {theme}. Challenge en {hd}."
                q["theme_mastery"] = round(mastery, 4)
                q["target_difficulty"] = hd
                pool_challenge.append(q)

        # Cas “nouveau joueur”
        if not pool_revision and not pool_challenge:
            tmp = list(self.db.questions.find({"difficulty": "facile"}, {"_id": 0}).limit(limit * 2))
            random.shuffle(tmp)
            for q in tmp[:limit]:
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

        # Dédoublonnage — garder la 1ère occurrence (préférence à "revision" arrivée en premier)
        uniq = {}
        for q in recos:
            qid = q["question_id"]
            if qid not in uniq:
                uniq[qid] = q
        recos = list(uniq.values())

        # Anti-répétition N dernières sessions — inutile si 'seen' exclut déjà TOUT l'historique
        recent_seen = _recent_seen_question_ids(self.db, user_id, last_sessions=3)
        # Ici ce filtre ne changera rien car 'seen' exclut déjà tout l'historique.
        recos = [q for q in recos if q["question_id"] not in recent_seen]

        # Diversité par thème
        recos = _diversify(recos, max_per_theme=2)

        return recos[:limit]


    # cache modèle DKT
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
        """Build single user sequence [(skill_idx, correct)] ordered by time."""
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
            if key not in skill2idx:  # should not happen
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
        seen = set()
        # questions déjà vues
        seen_pipe = [
            {"$lookup": {"from": "usersessions", "localField": "session_id", "foreignField": "user_session_id", "as": "us"}},
            {"$unwind": "$us"},
            {"$match": {"us.user_id": user_id}},
            {"$group": {"_id": "$question_id"}}
        ]
        for r in self.db.responses.aggregate(seen_pipe):
            if r["_id"]:
                seen.add(r["_id"])

        seq = self._user_sequence_for_dkt(user_id)
        p_vec = self._dkt_predict_vector(seq)  # size K

        # Construire mapping question -> score par proximité à cible
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