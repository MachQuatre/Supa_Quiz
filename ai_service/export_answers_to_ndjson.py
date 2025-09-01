import os, json, datetime as dt
from pymongo import MongoClient
from bson import ObjectId

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/")
MONGO_DB  = os.getenv("MONGO_DB", "quiz_app")
OUT       = os.getenv("OUTFILE", "/tmp/answers.ndjson")
WINDOW    = int(os.getenv("ANALYSIS_WINDOW_DAYS", "0"))  # 0 = pas de filtre date

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]

# --- Helpers ---------------------------------------------------------------
def to_str_id(v):
    if isinstance(v, ObjectId): return str(v)
    return str(v) if v is not None else ""

def get_date(doc):
    for k in ["answered_at","created_at","timestamp","date","played_at","submitted_at","updated_at"]:
        v = doc.get(k)
        if isinstance(v, dt.datetime): return v
        if isinstance(v, str):
            for parser in (dt.datetime.fromisoformat,):
                try: return parser(v.replace("Z","+00:00"))
                except: pass
    return None

def truthy_correct(v):
    if isinstance(v, bool): return v
    if isinstance(v, (int, float)): return v > 0
    if isinstance(v, str):
        s = v.strip().lower()
        return s in {"true","1","ok","yes","y","correct","right","success","win","passed"}
    if isinstance(v, dict):
        for k in ["is_correct","correct","ok","success","passed"]:
            if k in v: return truthy_correct(v[k])
    return None

def first_nonempty(doc, keys, default=""):
    for k in keys:
        v = doc.get(k)
        if v: return v
    return default

# --- 1) Construire une map des questions (id -> (text, theme, difficulty)) ---
qmap = {}
q_coll_names = [c for c in db.list_collection_names() if any(x in c.lower() for x in ["question","quiz"])]
if not q_coll_names:
    q_coll_names = ["questions"]  # fallback

for cname in q_coll_names:
    try:
        for q in db[cname].find({}).limit(100000):
            qid = to_str_id(first_nonempty(q, ["question_id","qid","id","_id"]))
            if not qid: continue
            text = first_nonempty(q, ["title","text","question","prompt","label"], "")
            theme = first_nonempty(q, ["theme","category","topic","subject"], "unknown")
            diff  = first_nonempty(q, ["difficulty","level","difficulty_level"], "unknown")
            if text:
                qmap[qid] = (str(text), str(theme).lower(), str(diff).lower())
    except Exception:
        pass

# --- 2) Parcourir les collections de réponses/sessions ----------------------
cand_answer_colls = [c for c in db.list_collection_names()
                     if any(x in c.lower() for x in ["response","answer","session","attempt","play","result","history"])]

if not cand_answer_colls:
    cand_answer_colls = ["responses","answers","user_sessions"]  # fallback

date_min = None
if WINDOW > 0:
    date_min = dt.datetime.utcnow() - dt.timedelta(days=WINDOW)

written, seen = 0, 0
with open(OUT, "w", encoding="utf-8") as f:
    for cname in cand_answer_colls:
        coll = db[cname]
        try:
            for doc in coll.find({}):
                # Filtre date au niveau doc (si présent)
                if date_min:
                    d = get_date(doc)
                    if d and d < date_min:
                        continue

                # CAS A : doc = une réponse unitaire
                if any(k in doc for k in ["question_id","questionId","qid","question","qId"]) and any(
                        k in doc for k in ["is_correct","correct","result","score","ok","success","passed"]):
                    seen += 1
                    qid = to_str_id(first_nonempty(doc, ["question_id","questionId","qid","question","qId"]))
                    is_c = truthy_correct(first_nonempty(doc, ["is_correct","correct","result","ok","success","passed","score"]))
                    text = first_nonempty(doc, ["question_text","text","title","question"], "")
                    theme = first_nonempty(doc, ["theme","category","topic","subject"], "unknown")
                    diff  = first_nonempty(doc, ["difficulty","level","difficulty_level"], "unknown")
                    if not text and qid in qmap:
                        text, theme_q, diff_q = qmap[qid]
                        if theme == "unknown": theme = theme_q
                        if diff  == "unknown": diff  = diff_q
                    if text and is_c is not None:
                        f.write(json.dumps({
                            "question_id": qid, "text": text,
                            "theme": str(theme).lower(), "difficulty": str(diff).lower(),
                            "is_correct": bool(is_c)
                        }, ensure_ascii=False) + "\n")
                        written += 1
                    continue

                # CAS B : doc = une session qui contient un tableau d'items
                for arr_key in ["questions_played","answers","responses","items","attempts","plays","history"]:
                    arr = doc.get(arr_key)
                    if not isinstance(arr, list): 
                        continue
                    for a in arr:
                        seen += 1
                        if date_min:
                            d = get_date(a)
                            if d and d < date_min:
                                continue
                        qid = to_str_id(first_nonempty(a, ["question_id","questionId","qid","question","qId"]))
                        is_c = truthy_correct(first_nonempty(a, ["is_correct","correct","result","ok","success","passed","score"]))
                        text = first_nonempty(a, ["question_text","text","title","question"], "")
                        theme = first_nonempty(a, ["theme","category","topic","subject"], "unknown")
                        diff  = first_nonempty(a, ["difficulty","level","difficulty_level"], "unknown")
                        if not text and qid in qmap:
                            text, theme_q, diff_q = qmap[qid]
                            if theme == "unknown": theme = theme_q
                            if diff  == "unknown": diff  = diff_q
                        if text and is_c is not None:
                            f.write(json.dumps({
                                "question_id": qid, "text": text,
                                "theme": str(theme).lower(), "difficulty": str(diff).lower(),
                                "is_correct": bool(is_c)
                            }, ensure_ascii=False) + "\n")
                            written += 1
        except Exception:
            # ignore collections non lisibles
            pass

print(f"Wrote {written} lines (scanned docs: {seen}) -> {OUT}")
