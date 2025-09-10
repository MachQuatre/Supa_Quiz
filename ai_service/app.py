import os, hmac, csv
import json
import random
import datetime as dt
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

from recommender import Recommender
from train_dkt import train as train_dkt
from metrics import dkt_holdout_metrics
from collections import defaultdict

# ---- charge les variables d'env avant de les lire ----
load_dotenv()

app = Flask(__name__)

# ---- sécurité légère (token partagé, optionnel) ----
AI_SHARED_SECRET = os.getenv("AI_SHARED_SECRET", "")
# routes autorisées sans token (santé + infos modèle)
WHITELIST_PATHS = {"/health", "/model/info"}
WORDCOUNTS_PATH = os.getenv("WORDCOUNTS_PATH", "/data/word_counts.tsv")

# ---- instance unique du moteur IA ----
rec = Recommender()

@app.before_request
def _auth_shared_token():
    # /health passe sans token
    if request.path in WHITELIST_PATHS:
        return None

    # si pas configuré → bypass (dev)
    if not AI_SHARED_SECRET:
        app.logger.warning("[auth] AI_SHARED_SECRET non défini → bypass")
        return None

    token = request.headers.get("X-AI-Token", "")
    if not hmac.compare_digest(token, AI_SHARED_SECRET):
        app.logger.warning("[auth] X-AI-Token invalide (present=%s len=%s)", bool(token), len(token) if token else 0)
        return jsonify({"success": False, "error": "unauthorized"}), 401
    return None

# ----------------- HEALTH -----------------
@app.get("/health")
def health():
    return {"status": "ok"}, 200

# ----------------- MODEL INFO (utile démo) -----------------
@app.get("/model/info")
def model_info():
    meta_path = os.path.join("model", "dkt_meta.json")
    pt_path = os.path.join("model", "dkt.pt")

    def _mtime(p):
        try:
            return int(os.path.getmtime(p))
        except Exception:
            return 0

    info = {
        "model_file": pt_path,
        "meta_file": meta_path,
        "exists": os.path.exists(pt_path) and os.path.exists(meta_path),
        "updated_at_epoch": max(_mtime(pt_path), _mtime(meta_path)),
        "num_skills": None,
    }
    try:
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
                info["num_skills"] = meta.get("num_skills")
    except Exception:
        pass
    return {"success": True, "model": info}, 200

# ----------------- ANALYSE -----------------
@app.get("/analysis/user/<user_id>")
def analysis_user(user_id):
    try:
        data = rec.user_theme_stats(user_id)
        return jsonify({"success": True, "user_id": user_id, "themes": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ----------------- ENTRAÎNEMENT DKT -----------------
@app.post("/train/dkt")
def train_dkt_endpoint():
    try:
        epochs = int(request.json.get("epochs", 8)) if request.is_json else 8
        train_dkt(epochs=epochs)
        return {"success": True, "message": f"DKT trained for {epochs} epochs"}, 200
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

# ----------------- RECOMMANDATIONS -----------------
@app.get("/recommendations")
def recommendations():
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return {"success": False, "error": "bad_request", "reason": "missing_user_id"}, 400

        # Params sûrs (bornes et types)
        try:
            limit = int(request.args.get("limit", "20"))
        except ValueError:
            limit = 20
        limit = max(1, min(limit, 50))  # borne 1..50

        try:
            mix_ratio = float(request.args.get("mix_ratio", "0.5"))
        except ValueError:
            mix_ratio = 0.5
        mix_ratio = max(0.0, min(mix_ratio, 1.0))  # borne 0..1

        policy = (request.args.get("policy", "heuristic") or "heuristic").lower()
        used_policy = policy
        fallback_used = None

        recos = []

        def _heuristic():
            return rec.recommended_questions(user_id, limit=limit, mix_ratio=mix_ratio)

        try:
            if policy == "dkt":
                recos = rec.recommended_questions_dkt(user_id, limit=limit, mix_ratio=mix_ratio)
            elif policy == "bandit":
                try:
                    recos = rec.recommended_questions_bandit(user_id, limit=limit, mix_ratio=mix_ratio)
                except Exception as e_bandit:
                    app.logger.warning("bandit failed for user_id=%s → fallback heuristic: %s", user_id, e_bandit)
                    used_policy = "heuristic"
                    fallback_used = "heuristic"
                    recos = _heuristic()
            else:
                recos = _heuristic()
        except Exception as e_policy:
            # Fallback global vers heuristic (si pas déjà essayé)
            if policy != "heuristic":
                app.logger.warning("%s failed for user_id=%s → fallback heuristic: %s", policy, user_id, e_policy)
                used_policy = "heuristic"
                fallback_used = "heuristic"
                try:
                    recos = _heuristic()
                except Exception as e_h:
                    msg = str(e_h).lower()
                    if "user" in msg and ("not found" in msg or "unknown" in msg or "absent" in msg):
                        app.logger.info("unknown user_id=%s → return empty list", user_id)
                        return {"success": True, "user_id": user_id, "count": 0, "items": [], "policy_used": used_policy, "fallback_used": fallback_used, "_note": "unknown_user"}, 200
                    app.logger.exception("heuristic ultimate failure for user_id=%s", user_id)
                    return {"success": False, "error": "internal_error"}, 500
            else:
                msg = str(e_policy).lower()
                if "user" in msg and ("not found" in msg or "unknown" in msg or "absent" in msg):
                    app.logger.info("unknown user_id=%s → return empty list", user_id)
                    return {"success": True, "user_id": user_id, "count": 0, "items": [], "policy_used": used_policy}, 200
                app.logger.exception("policy heuristic failed for user_id=%s", user_id)
                return {"success": False, "error": "internal_error"}, 500

        # Normalisation / vide = succès
        if not isinstance(recos, list):
            recos = list(recos) if recos is not None else []
        if not recos:
            app.logger.info("no recos for user_id=%s → return empty", user_id)

        payload = {
            "success": True,
            "user_id": user_id,
            "count": len(recos),
            "items": recos,
            "policy_used": used_policy,
        }
        if fallback_used:
            payload["fallback_used"] = fallback_used
        return payload, 200

    except Exception:
        app.logger.exception("recommendations fatal error")
        return {"success": False, "error": "internal_error"}, 500

# ----------------- METRIQUES DKT -----------------
@app.get("/metrics/dkt")
def metrics_dkt():
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return {"success": False, "error": "user_id requis"}, 400
        m = dkt_holdout_metrics(user_id)
        return {"success": True, "metrics": m}, 200
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

# ----------------- COMPARAISON POLICIES -----------------
@app.get("/compare_policies")
def compare_policies():
    try:
        user_id = request.args.get("user_id")
        limit = int(request.args.get("limit", "10"))
        if not user_id:
            return {"success": False, "error": "user_id requis"}, 400

        items_h = rec.recommended_questions(user_id, limit=limit, mix_ratio=0.5)
        try:
            items_b = rec.recommended_questions_bandit(user_id, limit=limit, mix_ratio=0.5)
        except Exception:
            items_b = []
        try:
            items_d = rec.recommended_questions_dkt(user_id, limit=limit, mix_ratio=0.5)
        except Exception:
            items_d = []

        from metrics import summarize_with_dkt_p
        sum_h = summarize_with_dkt_p(rec, user_id, items_h)
        sum_b = summarize_with_dkt_p(rec, user_id, items_b)
        sum_d = summarize_with_dkt_p(rec, user_id, items_d)

        return {
            "success": True,
            "user_id": user_id,
            "limit": limit,
            "summary": {"heuristic": sum_h, "bandit": sum_b, "dkt": sum_d},
            "items": {"heuristic": items_h, "bandit": items_b, "dkt": items_d}
        }, 200
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

# ----------------- SIMULATION SESSION (démo impact) -----------------
@app.post("/simulate/session")
def simulate_session():
    """
    Body JSON: { "user_id": "...", "policy": "heuristic|bandit|dkt", "limit": 10 }
    - Choisit des recos via la policy
    - Estime p(correct) (DKT)
    - Tire des réponses ~ Bernoulli(p)
    - Écrit une nouvelle session + responses dans Mongo
    - Retourne analyse avant/après + résumé
    """
    try:
        data = request.get_json(force=True) or {}
        user_id = data.get("user_id")
        policy = (data.get("policy") or "heuristic").lower()
        limit = int(data.get("limit") or 10)
        if not user_id:
            return {"success": False, "error": "user_id requis"}, 400

        # analyse avant
        before = rec.user_theme_stats(user_id)

        # recos
        if policy == "dkt":
            items = rec.recommended_questions_dkt(user_id, limit=limit, mix_ratio=0.5)
        elif policy == "bandit":
            try:
                items = rec.recommended_questions_bandit(user_id, limit=limit, mix_ratio=0.5)
            except Exception:
                items = rec.recommended_questions(user_id, limit=limit, mix_ratio=0.5)
        else:
            items = rec.recommended_questions(user_id, limit=limit, mix_ratio=0.5)

        # proba via DKT
        rec._load_dkt()
        seq = rec._user_sequence_for_dkt(user_id)
        p_vec = rec._dkt_predict_vector(seq)
        idx_of = rec._dkt_meta["skill2idx"]

        # créer une session
        now = dt.datetime.utcnow()
        sid = f"US_SIM_{user_id}_{int(now.timestamp())}"
        rec.db.usersessions.insert_one({
            "user_session_id": sid,
            "user_id": user_id,
            "started_at": now
        })

        results = []
        for i, q in enumerate(items):
            key = f"{q['theme']}|||{q['difficulty']}"
            p = float(p_vec[idx_of.get(key, 0)]) if key in idx_of else 0.6
            correct = random.random() < p
            rec.db.responses.insert_one({
                "session_id": sid,
                "question_id": q["question_id"],
                "is_correct": bool(correct),
                "response_time": random.randint(1500, 12000),
                "answered_at": now + dt.timedelta(seconds=30 * (i + 1))
            })
            results.append({
                "question_id": q["question_id"],
                "theme": q["theme"],
                "difficulty": q["difficulty"],
                "p_est": round(p, 3),
                "is_correct": bool(correct)
            })

        # analyse après
        after = rec.user_theme_stats(user_id)

        return {
            "success": True,
            "user_id": user_id,
            "policy": policy,
            "session_id": sid,
            "results": results,
            "before": before,
            "after": after
        }, 200
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

# ----------------- BOUCLE DE JEU (intégration app) -----------------
@app.post("/session/start")
def session_start():
    """
    Body JSON: { "user_id": "...", "policy": "dkt|heuristic|bandit", "session_id"?: "..." }
    Crée (idempotent) la session utilisateur dans usersessions.
    """
    try:
        data = request.get_json(force=True) or {}
        user_id = data.get("user_id")
        policy = (data.get("policy") or "dkt").lower()
        if not user_id:
            return {"success": False, "error": "user_id requis"}, 400

        now = dt.datetime.utcnow()
        session_id = data.get("session_id") or f"US_{user_id}_{int(now.timestamp())}"

        if not rec.db.usersessions.find_one({"user_session_id": session_id}):
            rec.db.usersessions.insert_one({
                "user_session_id": session_id,
                "user_id": user_id,
                "started_at": now,
                "policy": policy
            })

        return {"success": True, "session_id": session_id, "policy": policy}, 200
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.post("/response")
def record_response():
    """
    Body JSON: {
      "user_id": "...", "session_id": "...", "question_id": "...",
      "is_correct": true/false, "response_time_ms": 5200, "answered_at": ISO8601
    }
    Enregistre une réponse dans responses (et crée la session si absente).
    """
    try:
        data = request.get_json(force=True) or {}
        user_id = data.get("user_id")
        session_id = data.get("session_id")
        question_id = data.get("question_id")
        is_correct = bool(data.get("is_correct"))
        resp_ms = int(data.get("response_time_ms") or data.get("response_time") or 0)
        answered_at = data.get("answered_at")

        if not (user_id and session_id and question_id):
            return {"success": False, "error": "user_id, session_id, question_id requis"}, 400

        # assure l'existence de la session (souple)
        if not rec.db.usersessions.find_one({"user_session_id": session_id}):
            rec.db.usersessions.insert_one({
                "user_session_id": session_id,
                "user_id": user_id,
                "started_at": dt.datetime.utcnow(),
                "policy": data.get("policy") or "dkt"
            })

        doc = {
            "session_id": session_id,
            "question_id": question_id,
            "is_correct": is_correct,
            "response_time": resp_ms,
            "answered_at": dt.datetime.fromisoformat(answered_at) if answered_at else dt.datetime.utcnow()
        }
        rec.db.responses.insert_one(doc)
        return {"success": True, "saved": doc}, 200
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

def _load_word_stats(theme: str):
    stats = defaultdict(lambda: {"1": 0, "0": 0})
    if not os.path.exists(WORDCOUNTS_PATH):
        return None

    with open(WORDCOUNTS_PATH, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) != 4:
                continue
            word, outcome, th, count = parts[0], parts[1], parts[2], parts[3]
            try:
                count = int(count)
            except ValueError:
                continue
            if theme.lower() != "all" and th.lower() != theme.lower():
                continue
            if outcome not in ("0", "1"):
                continue
            stats[word][outcome] += count

    rows = []
    for w, c in stats.items():
        total = c["1"] + c["0"]
        if total < 5:  # anti-bruit
            continue
        ratio = (c["1"] + 1.0) / (c["0"] + 1.0)  # lissage
        rows.append({"word": w, "ok": c["1"], "ko": c["0"], "total": total, "ratio": ratio})

    # Top pro-succès (ratio élevé) et pro-échec (ratio faible)
    rows_sorted = sorted(rows, key=lambda r: r["ratio"], reverse=True)
    success_top = rows_sorted[:25]
    failure_top = list(reversed(rows_sorted))[:25]  # plus faibles ratios
    return {"success_top": success_top, "failure_top": failure_top}

@app.get("/api/words")
def api_words():
    theme = (request.args.get("theme") or "all").strip()
    data = _load_word_stats(theme)
    if data is None:
        return jsonify({"success": False, "error": f"TSV not found at {WORDCOUNTS_PATH}"}), 404
    return jsonify({"success": True, "theme": theme, **data})

@app.get("/dashboard/words")
def dashboard_words():
    theme = (request.args.get("theme") or "all").strip()
    return render_template("words.html", theme=theme)


# ----------------- MAIN -----------------
if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5001"))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    app.run(host=host, port=port, debug=debug)
