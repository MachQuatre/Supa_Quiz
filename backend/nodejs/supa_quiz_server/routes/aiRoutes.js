// routes/aiRoutes.js
const router = require('express').Router();
const ai = require('../controllers/aiController');

// Petit health-check (facultatif)
router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

// ⚠️ Ici on matche exactement tes NOMS DE FONCTIONS et PARAMS
router.get('/analysis/user/:user_id', ai.getAnalysis);
router.get('/recommendations', ai.getRecommendations);
router.post('/recommendations/prewarm', ai.prewarmRecommendations);

module.exports = router;
