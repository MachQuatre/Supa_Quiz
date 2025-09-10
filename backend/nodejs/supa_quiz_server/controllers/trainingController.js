// controllers/trainingController.js
const axios = require('axios');

const PY_AI_URL = process.env.PY_AI_URL || 'http://127.0.0.1:5001';
const AI_SHARED_SECRET = process.env.AI_SHARED_SECRET || '';
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 8000);

console.log('[trainingController] PY_AI_URL =', PY_AI_URL);
console.log('[trainingController] AI_SHARED_SECRET set =', AI_SHARED_SECRET ? 'yes' : 'NO');

const http = axios.create({
  baseURL: PY_AI_URL,
  timeout: TIMEOUT_MS,
});

// 🔐 FORCER le header sur TOUTES les requêtes (GET/POST/…)
http.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (AI_SHARED_SECRET) {
    config.headers['X-AI-Token'] = AI_SHARED_SECRET;
  }
  return config;
});

function pickUserId(req) {
  return (
    req.query.user_id ||
    req.user?.user_id || req.user?.id || req.user?._id ||
    req.auth?.id || req.auth?.user_id ||
    req.headers['x-user-id'] || null
  );
}

exports.getRecommendations = async (req, res) => {
  try {
    const userId = pickUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'unauthorized', reason: 'missing_user' });
    }
    const limit = Number.parseInt(req.query.limit || '20', 10);
    const policy = req.query.policy;
    const mix_ratio = req.query.mix_ratio;

    const { data } = await http.get('/recommendations', {
      params: { user_id: userId, limit, policy, mix_ratio },
    });
    return res.json(data);
  } catch (e) {
    const details = e.response
      ? `HTTP ${e.response.status} ${JSON.stringify(e.response.data)}`
      : e.code
        ? `${e.code} ${e.message}`
        : String(e);
    console.error('[trainingController] AI call failed ->', details);
    return res.status(502).json({ success: false, error: 'ai_unreachable', details });
  }
};

module.exports = { getRecommendations: exports.getRecommendations };
