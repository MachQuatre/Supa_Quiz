const axios = require("axios");
const crypto = require("crypto");

// --- CONFIG ---
const PY_AI_URL = process.env.PY_AI_URL || "http://localhost:5001";
const AI_SHARED_SECRET = process.env.AI_SHARED_SECRET || ""; // doit matcher côté Flask
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 3000);
const CACHE_TTL_MS = Number(process.env.AI_CACHE_TTL_MS || 60000); // 60s
const MAX_RETRIES = Number(process.env.AI_MAX_RETRIES || 2);

// --- Mémoization simple en mémoire ---
const cache = new Map(); // key -> { data, exp }
function getCache(key) {
  const v = cache.get(key);
  if (v && v.exp > Date.now()) return v.data;
  if (v) cache.delete(key);
  return null;
}
function setCache(key, data, ttl = CACHE_TTL_MS) {
  cache.set(key, { data, exp: Date.now() + ttl });
}
function cacheKey(path, params) {
  const s = JSON.stringify({ path, params });
  return crypto.createHash("sha1").update(s).digest("hex");
}

// --- Axios instance ---
const http = axios.create({
  baseURL: PY_AI_URL,
  timeout: TIMEOUT_MS,
  headers: AI_SHARED_SECRET ? { "X-AI-Token": AI_SHARED_SECRET } : {}
});

// --- helpers retry ---
async function callWithRetry(fn) {
  let lastErr;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try { return await fn(); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// --- Controllers ---
exports.getAnalysis = async (req, res) => {
  try {
    const { user_id } = req.params;
    const key = cacheKey("/analysis", { user_id });
    const cached = getCache(key);
    if (cached) return res.status(200).json({ ...cached, _cached: true });

    const { data } = await callWithRetry(() => http.get(`/analysis/user/${user_id}`));
    setCache(key, data);
    res.status(200).json(data);
  } catch (err) {
    // fallback: dernière valeur de cache si dispo
    const { user_id } = req.params;
    const key = cacheKey("/analysis", { user_id });
    const cached = getCache(key);
    if (cached) return res.status(200).json({ ...cached, _stale: true });
    res.status(502).json({ success: false, message: "IA indisponible (analysis)", error: err.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const { user_id, limit, mix_ratio, policy } = req.query;
    if (!user_id) return res.status(400).json({ success: false, message: "user_id requis" });

    const params = { user_id, limit, mix_ratio, policy };
    const key = cacheKey("/recommendations", params);
    const cached = getCache(key);
    if (cached) return res.status(200).json({ ...cached, _cached: true });

    // 1) tentative sur policy demandée
    const tryPolicy = async (p) => {
      const { data } = await http.get("/recommendations", {
        params: { ...params, policy: p }
      });
      return data;
    };

    let data;
    try {
      data = await callWithRetry(() => tryPolicy(policy));
    } catch (e) {
      // 2) fallback : tente "heuristic" si autre policy demandée
      if (policy && policy !== "heuristic") {
        data = await callWithRetry(() => tryPolicy("heuristic"));
        data._fallback = "heuristic";
      } else {
        throw e;
      }
    }

    setCache(key, data);
    res.status(200).json(data);
  } catch (err) {
    // fallback ultérieur : renvoyer dernier cache si dispo
    const { user_id, limit, mix_ratio, policy } = req.query;
    const params = { user_id, limit, mix_ratio, policy };
    const key = cacheKey("/recommendations", params);
    const cached = getCache(key);
    if (cached) return res.status(200).json({ ...cached, _stale: true });
    res.status(502).json({ success: false, message: "IA indisponible (recommendations)", error: err.message });
  }
};

// --- Bonus: préchauffe le cache (utile en jeu quand il reste 2 questions) ---
exports.prewarmRecommendations = async (req, res) => {
  try {
    const { user_id, limit = 12, policy = "dkt", mix_ratio } = req.query;
    if (!user_id) return res.status(400).json({ success: false, message: "user_id requis" });
    const params = { user_id, limit, mix_ratio, policy };
    const key = cacheKey("/recommendations", params);
    const { data } = await http.get("/recommendations", { params });
    setCache(key, data);
    res.status(200).json({ success: true, prewarmed: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Préwarm échoué", error: err.message });
  }
};

// --- DKT metrics / compare / simulate proxy inchangés si tu les as déjà ---
// Copie/colle tes autres handlers existants ici si besoin, en les passant via `http` pour profiter du header + timeout.
