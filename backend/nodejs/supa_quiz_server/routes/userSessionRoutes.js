// routes/userSessionRoutes.js
const express = require("express");
const router = require("express").Router();
const ctrl = require("../controllers/userSessionController");
const auth = require("../middleware/auth");

// ⚠️ importe le bon contrôleur (extension explicite)
const controller = require("../controllers/userSessionController.js");

// Debug: liste les exports réellement chargés
console.log("DEBUG userSessionController exports:", controller && Object.keys(controller));

// Garde-fou: lève une erreur lisible si une fonction est absente
function requireFn(fn, name) {
  if (typeof fn !== "function") {
    throw new Error(`Contrôleur manquant: ${name} est ${typeof fn}`);
  }
  return fn;
}

// Créer une UserSession
router.post("/", requireFn(controller.createUserSession, "createUserSession"));

// Mettre à jour une UserSession
router.patch("/:user_session_id", requireFn(controller.updateUserSession, "updateUserSession"));

// Récupérer les sessions d’un user
router.get("/user/:user_id", requireFn(controller.getUserSessions, "getUserSessions"));

// Enregistrer une réponse
router.post("/:user_session_id/answer", requireFn(controller.submitAnswer, "submitAnswer"));

// Enregistrer le résumé final
router.post("/:user_session_id/summary", requireFn(controller.submitSessionSummary, "submitSessionSummary"));

// Résumé profil (10 dernières + total)
router.get("/me/summary", requireFn(controller.getMySummary, "getMySummary"));

router.post(
  "/:user_session_id/end",
  requireFn(controller.endGameSession, "endGameSession")
);

router.post("/record", auth, controller.recordTrainingEvent); // <-- protège la route
router.get("/logs", controller.listTrainingEvents);

module.exports = router;
