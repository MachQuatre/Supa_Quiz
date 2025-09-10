// services/aiClient.js
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const AI_SHARED_SECRET = process.env.AI_SHARED_SECRET || '';

function _headers() {
  return AI_SHARED_SECRET ? { 'X-AI-Token': AI_SHARED_SECRET } : {};
}

async function getTrainingRecommendations(userId, limit = 20) {
  const url = `${AI_SERVICE_URL}/recommendations/user/${encodeURIComponent(userId)}?type=training&n=${limit}`;
  const res = await axios.get(url, { headers: _headers(), timeout: 8000 });
  if (!res.data || res.data.success !== true || !Array.isArray(res.data.items)) {
    throw new Error('Bad AI response shape');
  }
  return res.data.items;
}

// Optionnel mais utile si ta route existe côté IA :
async function getUserAnalysis(userId) {
  const url = `${AI_SERVICE_URL}/analysis/user/${encodeURIComponent(userId)}`;
  const res = await axios.get(url, { headers: _headers(), timeout: 8000 });
  return res.data;
}

module.exports = {
  getTrainingRecommendations,
  getUserAnalysis, // <-- assure-toi qu'il est exporté si aiRoutes l'utilise
};
