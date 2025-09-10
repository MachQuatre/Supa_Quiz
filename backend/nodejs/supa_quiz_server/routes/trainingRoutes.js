// backend/nodejs/supa_quiz_server/routes/trainingRoutes.js
const router = require('express').Router();
const controller = require('../controllers/trainingController');

// 🔐 Récupère TON middleware d'auth quel que soit son export
let authModule;
try { authModule = authModule || require('../middlewares/authMiddleware'); } catch (_) {}

// supporte différents styles d'export (named, default, export direct de la fonction)
let authMiddleware = null;
if (authModule) {
  authMiddleware =
    authModule.authMiddleware ||
    authModule.default ||
    (typeof authModule === 'function' ? authModule : null);
}

// 🛠️ petits logs pour diagnostiquer si quelque chose est undefined
console.log('[trainingRoutes] typeof authMiddleware =', typeof authMiddleware);
console.log('[trainingRoutes] controller keys =', Object.keys(controller));

// garde-fou pour éviter l’erreur Express
function ensureFn(fn, label) {
  if (typeof fn !== 'function') {
    console.error(`[trainingRoutes] ${label} is NOT a function ->`, fn);
    return null;
  }
  return fn;
}

const handler = ensureFn(controller.getRecommendations, 'controller.getRecommendations');

if (!handler) {
  // on expose une erreur claire si le controller est manquant
  router.get('/recommendations', (_req, res) =>
    res.status(500).json({ success: false, error: 'handler_missing' })
  );
} else if (authMiddleware) {
  router.get('/recommendations', authMiddleware, handler);
} else {
  console.warn('[trainingRoutes] authMiddleware introuvable → route publique TEMPORAIRE');
  router.get('/recommendations', handler);
}

module.exports = router;
