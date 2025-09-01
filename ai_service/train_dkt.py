import os
import json
import math
import numpy as np
import datetime as dt
from typing import List, Dict, Tuple
from pymongo import MongoClient
from dotenv import load_dotenv

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

from models.dkt import DKT

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME   = os.getenv("MONGO_DB", "quiz_app")
MODEL_DIR = os.getenv("MODEL_DIR", "model")
os.makedirs(MODEL_DIR, exist_ok=True)

META_PATH  = os.path.join(MODEL_DIR, "dkt_meta.json")
MODEL_PATH = os.path.join(MODEL_DIR, "dkt.pt")

# ---------- Utils: build skill mapping (theme x difficulty) ----------
def build_skill_mapping(db) -> Dict[str, int]:
    # key = f"{theme}|||{difficulty}"
    skills = []
    for doc in db.questions.aggregate([
        {"$group": {"_id": {"theme": "$theme", "difficulty": "$difficulty"}}},
        {"$sort": {"_id.theme": 1, "_id.difficulty": 1}}
    ]):
        k = f"{doc['_id']['theme']}|||{doc['_id']['difficulty']}"
        skills.append(k)
    return {k: i for i, k in enumerate(skills)}

# ---------- Dataset ----------
class DKTDataset(Dataset):
    def __init__(self, sequences: List[List[Tuple[int, int]]], num_skills: int, max_len: int = 200):
        """
        sequences: list of user sequences
          a sequence is a list of (skill_index, is_correct) ordered by time
        """
        self.num_skills = num_skills
        self.max_len = max_len
        self.data = []
        for seq in sequences:
            if len(seq) < 2:
                continue
            # chop into windows of max_len
            for s in range(0, len(seq), max_len):
                window = seq[s:s+max_len]
                if len(window) >= 2:
                    self.data.append(window)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        seq = self.data[idx]
        T = len(seq)
        # Input X_t encodes the PREVIOUS interaction; target is at SAME t (next skill correctness)
        # We shift by 1 so first input is the first interaction and target is the second, etc.
        # Build one-hot 2K
        K = self.num_skills
        x = np.zeros((T-1, 2*K), dtype=np.float32)
        y = np.zeros((T-1, K), dtype=np.float32)
        for t in range(T-1):
            s_prev, c_prev = seq[t]
            s_next, c_next = seq[t+1]
            # encode previous (s_prev, c_prev)
            if c_prev == 1:
                x[t, s_prev] = 1.0
            else:
                x[t, K + s_prev] = 1.0
            # target is correctness on skill s_next at next step
            y[t, s_next] = c_next
        return torch.from_numpy(x), torch.from_numpy(y)

# ---------- Load sequences from Mongo ----------
def load_sequences(db, skill2idx: Dict[str, int]) -> List[List[Tuple[int, int]]]:
    """Return list of per-user sequences: [(skill_idx, is_correct), ...] time-ordered."""
    pipeline = [
        {"$lookup": { "from": "usersessions", "localField": "session_id", "foreignField": "user_session_id", "as": "us" }},
        {"$unwind": "$us"},
        {"$lookup": { "from": "questions", "localField": "question_id", "foreignField": "question_id", "as": "q" }},
        {"$unwind": "$q"},
        {"$project": {
            "user_id": "$us.user_id",
            "answered_at": 1,
            "is_correct": 1,
            "theme": "$q.theme",
            "difficulty": "$q.difficulty"
        }},
        {"$sort": {"user_id": 1, "answered_at": 1}}
    ]
    seqs = []
    current_user = None
    buf = []
    for r in db.responses.aggregate(pipeline):
        uid = r["user_id"]
        key = f"{r['theme']}|||{r['difficulty']}"
        if key not in skill2idx:
            # unseen skill due to schema mismatch; skip
            continue
        sidx = skill2idx[key]
        c = 1 if r.get("is_correct") else 0
        if current_user is None:
            current_user = uid
        if uid != current_user:
            if len(buf) >= 2:
                seqs.append(buf)
            buf = []
            current_user = uid
        buf.append((sidx, c))
    if len(buf) >= 2:
        seqs.append(buf)
    return seqs

# ---------- Train ----------
def train(epochs=8, batch_size=64, hidden=128, dropout=0.1, max_len=200, lr=1e-3, seed=42):
    np.random.seed(seed)
    torch.manual_seed(seed)

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    skill2idx = build_skill_mapping(db)
    idx2skill = {v: k for k, v in skill2idx.items()}
    K = len(skill2idx)
    if K == 0:
        raise RuntimeError("No skills found. Ensure 'questions' collection has theme & difficulty populated.")

    seqs = load_sequences(db, skill2idx)
    if len(seqs) == 0:
        raise RuntimeError("No sequences found. You need responses to train DKT.")

    ds = DKTDataset(seqs, num_skills=K, max_len=max_len)
    dl = DataLoader(ds, batch_size=batch_size, shuffle=True)

    model = DKT(num_skills=K, hidden_size=hidden, dropout=dropout)
    optim = torch.optim.Adam(model.parameters(), lr=lr)
    bce = nn.BCELoss()

    model.train()
    for ep in range(1, epochs+1):
        total_loss = 0.0
        n_batches = 0
        for x, y in dl:
            # x:[B,T,2K], y:[B,T,K]
            optim.zero_grad()
            yhat = model(x)
            loss = bce(yhat, y)
            loss.backward()
            optim.step()
            total_loss += float(loss.detach().cpu().item())
            n_batches += 1
        print(f"[DKT] epoch {ep}/{epochs} | loss={total_loss/max(1,n_batches):.4f}")

    # save
    torch.save(model.state_dict(), MODEL_PATH)
    meta = {
        "num_skills": K,
        "skill2idx": skill2idx,
        "idx2skill": idx2skill,
        "trained_at": dt.datetime.utcnow().isoformat()
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f)
    print(f"Saved model -> {MODEL_PATH}, meta -> {META_PATH}")

if __name__ == "__main__":
    # simple CLI via envs (optional)
    EPOCHS = int(os.getenv("DKT_EPOCHS", "8"))
    train(epochs=EPOCHS)
