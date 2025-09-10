#!/bin/sh
set -e

echo "[entrypoint] Waiting for Mongo at: ${MONGO_URI:-mongodb://mongo:27017/quiz_app}"

# ⏳ attend Mongo (30 tentatives, ~60s)
for i in $(seq 1 30); do
  node -e "
    const mongoose = require('mongoose');
    const uri = process.env.MONGO_URI || 'mongodb://mongo:27017/quiz_app';
    mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 })
      .then(() => { process.exit(0); })
      .catch(() => { process.exit(1); });
  " && break
  echo "[entrypoint] Mongo not ready yet… retry $i"
  sleep 2
done

# 🛠️ lance setup.js (doit être idempotent : si l'admin existe déjà, sortir 0)
if [ -f /app/setup.js ]; then
  echo "[entrypoint] Running setup.js (idempotent)…"
  node /app/setup.js || echo "[entrypoint] setup.js returned non-zero (ignored)"
else
  echo "[entrypoint] No /app/setup.js found — skipping."
fi

echo "[entrypoint] Starting app: $*"
exec "$@"
