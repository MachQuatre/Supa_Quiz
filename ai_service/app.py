import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from recommender import Recommender
from train_dkt import train as train_dkt
from metrics import dkt_holdout_metrics
import random, datetime as dt

AI_SHARED_SECRET = os.getenv("AI_SHARED_SECRET", "")

# Autoriser health sans token. Tout le reste requiert le header X-AI-Token.
WHITELIST_PATHS = {"/health"}

@app.before_request
def _auth_shared_token():
    if request.path in WHITELIST_PATHS:
        return None
    if not AI_SHARED_SECRET:
        return None  # token non configuré -> pas de filtre (dev)
    token = request.headers.get("X-AI-Token", "")
    if token != AI_SHARED_SECRET:
        return jsonify({"success": False, "error": "unauthorized"}), 401
    return None


load_dotenv()
app = Flask(__name__)
rec = Recommender()

@app.get("/health")
def health():
    return {"status": "ok"}, 200

@app.get("/analysis/user/<user_id>")
def analysis_user(user_id):
    try:
        data = rec.user_theme_stats(user_id)
        return jsonify({"success": True, "user_id": user_id, "themes": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.post("/train/dkt")
def train_dkt_endpoint():
    try:
        epochs = int(request.json.get("epochs", 8)) if request.is_json else 8
        train_dkt(epochs=epochs)
        return {"success": True, "message": f"DKT trained for {epochs} epochs"}, 200
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.get("/recommendations")
def recommendations():
    try:
        user_id = request.args.get("user_id")
        limit = int(request.args.get("limit", "10"))
        mix_ratio = float(request.args.get("mix_ratio", "0.5"))
        policy = request.args.get("policy", "heuristic")
        if not user_id:
            return {"success": False, "error": "user_id requis"}, 400

        if policy == "dkt":
            recos = rec.recommended_questions_dkt(user_id, limit=limit, mix_ratio=mix_ratio)
        else:
            # "heuristic" ou "bandit" si tu gardes l'autre policy
            recos = rec.recommended_questions(user_id, limit=limit, mix_ratio=mix_ratio)

        return {"success": True, "user_id": user_id, "count": len(recos), "items": recos}, 200
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

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

# --- NOUVEL ENDPOINT: comparaison de stratégies ---
@app.get("/compare_policies")
def compare_policies():
    try:
        user_id = request.args.get("user_id")
        limit = int(request.args.get("limit", "10"))
        if not user_id:
            return {"success": False, "error": "user_id requis"}, 400

        # recos par policy
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
            "summary": {
                "heuristic": sum_h,
                "bandit": sum_b,
                "dkt": sum_d
            },
            "items": {
                "heuristic": items_h,
                "bandit": items_b,
                "dkt": items_d
            }
        }, 200
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

# --- NOUVEL ENDPOINT: simulation d'une session ---
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
            items = rec.recommended_questions_bandit(user_id, limit=limit, mix_ratio=0.5)
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
                "answered_at": now + dt.timedelta(seconds=30*(i+1))
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

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5001"))
    app.run(host=host, port=port)
