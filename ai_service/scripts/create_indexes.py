# FICHIER: ai_service/scripts/create_indexes.py
import os
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import OperationFailure

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/")
DB_NAME   = os.getenv("MONGO_DB", "quiz_app")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def safe_create_index(coll, keys, **kwargs):
    try:
        name = coll.create_index(keys, **kwargs)
        print(f"[OK] {coll.name}.{name}")
    except OperationFailure as e:
        # 85 = IndexOptionsConflict (souvent: même clés mais autre nom déjà existant)
        if e.code == 85:
            print(f"[SKIP] {coll.name} {keys} (déjà présent, autre nom)")
        else:
            raise

# Idempotent: on ne force PAS de name -> réutilise l'existant si compatible
safe_create_index(db.questions,    [("theme", ASCENDING), ("difficulty", ASCENDING)])
safe_create_index(db.usersessions, [("user_id", ASCENDING), ("started_at", DESCENDING)])
safe_create_index(db.responses,    [("session_id", ASCENDING), ("answered_at", ASCENDING)])
safe_create_index(db.responses,    [("question_id", ASCENDING)])

print("Indexes OK.")
