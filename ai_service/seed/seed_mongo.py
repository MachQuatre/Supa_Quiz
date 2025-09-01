import os
import random
import string
import datetime as dt
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME   = os.getenv("MONGO_DB", "quiz_app")

random.seed(42)

def rid(prefix, n=8):
    return prefix + "_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=n))

def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # wipe léger (pour démo)
    db.questions.delete_many({})
    db.usersessions.delete_many({})
    db.responses.delete_many({})

    # Index utiles
    db.questions.create_index([("question_id", ASCENDING)], unique=True)
    db.questions.create_index([("theme", ASCENDING), ("difficulty", ASCENDING)])
    db.usersessions.create_index([("user_session_id", ASCENDING)], unique=True)
    db.usersessions.create_index([("user_id", ASCENDING)])
    db.responses.create_index([("session_id", ASCENDING)])
    db.responses.create_index([("question_id", ASCENDING)])
    db.responses.create_index([("answered_at", ASCENDING)])

    # Jeux de thèmes/difficultés
    themes = ["Histoire", "Géographie", "Science", "Sport", "Cinéma", "Musique"]
    diffs = ["facile", "moyen", "difficile"]

    # Générer ~300 questions
    questions = []
    for t in themes:
        for d in diffs:
            for i in range(1, 18):  # 17 par couple -> ~306 total
                qid = f"Q_{t[:3]}_{d[:1]}_{i:02d}"
                questions.append({
                    "question_id": qid,
                    "theme": t,
                    "difficulty": d,
                    "title": f"{t} - {d} - {i}",
                    "choices": ["A","B","C","D"],
                    "answer": "A"
                })
    db.questions.insert_many(questions)

    # 3 utilisateurs de test
    users = ["user_1", "user_2", "user_3"]

    # Créer des sessions et réponses sur 20 jours
    base = dt.datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0)
    for u in users:
        # 8 sessions / user
        for sidx in range(8):
            usid = f"US_{u}_{sidx+1:02d}"
            started = base - dt.timedelta(days=random.randint(0, 19))
            db.usersessions.insert_one({
                "user_session_id": usid,
                "user_id": u,
                "started_at": started
            })

            # ~12 réponses/session
            for _ in range(12):
                theme = random.choice(themes)
                # rendre certains users mauvais en Histoire/Sport pour voir la tendance
                if u == "user_1" and theme == "Histoire":
                    diff = random.choices(diffs, weights=[0.6, 0.3, 0.1])[0]
                    correct_p = {"facile": 0.55, "moyen": 0.35, "difficile": 0.2}[diff]
                elif u == "user_2" and theme == "Sport":
                    diff = random.choices(diffs, weights=[0.5, 0.35, 0.15])[0]
                    correct_p = {"facile": 0.6, "moyen": 0.4, "difficile": 0.25}[diff]
                else:
                    diff = random.choice(diffs)
                    correct_p = {"facile": 0.8, "moyen": 0.55, "difficile": 0.35}[diff]

                # pick question not too systematically
                q = db.questions.find_one({"theme": theme, "difficulty": diff})
                qid = q["question_id"]

                answered_at = started + dt.timedelta(minutes=random.randint(1, 240))
                response_time = random.randint(1500, 14000)  # ms
                is_correct = random.random() < correct_p

                db.responses.insert_one({
                    "session_id": usid,
                    "question_id": qid,
                    "is_correct": is_correct,
                    "response_time": response_time,
                    "answered_at": answered_at
                })

    print("Seed terminé. Utilisateurs :", users)

if __name__ == "__main__":
    main()
