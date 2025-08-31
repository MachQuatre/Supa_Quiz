const express = require("express");
const router = express.Router();

const GameSession = require("../models/gameSessionModel");
const Quiz = require("../models/quizModel");
const Question = require("../models/questionModel");

// ⚠️ Import sécurisé + debug des exports
const controller = require("../controllers/gameSessionController");
console.log(
  "DEBUG gameSessionController exports:",
  controller && Object.keys(controller)
);

// Helpers pour échouer proprement si undefined
function requireFn(fn, name) {
  if (typeof fn !== "function") {
    throw new Error(`Contrôleur manquant: ${name} est ${typeof fn}`);
  }
  return fn;
}

// ----------------- Créer une session -----------------
router.post("/", requireFn(controller.createGameSession, "createGameSession"));

// ----------------- Lister les sessions actives -----------------
router.get("/active", async (req, res) => {
  try {
    const sessions = await GameSession.find({ is_active: true }).lean();

    const quizIds = [...new Set(sessions.map(s => s.quiz_id).filter(Boolean))];
    const quizzes = await Quiz.find({ quiz_id: { $in: quizIds } })
      .select({ quiz_id: 1, title: 1 })
      .lean();
    const quizTitleById = Object.fromEntries(
      quizzes.map(q => [q.quiz_id, q.title || "Quiz"])
    );

    const result = sessions.map(s => ({
      code: s.session_id,
      quiz_title: quizTitleById[s.quiz_id] || "Quiz inconnu",
      duration: s.duration_minutes,
      start_time: s.created_at,
      participants: s.participants || [],
    }));

    res.json(result);
  } catch (err) {
    console.error("Erreur sessions actives :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ----------------- Rejoindre une session -----------------
router.post(
  "/:session_id/join",
  requireFn(controller.joinGameSession, "joinGameSession")
);

// ----------------- Clôturer une session -----------------
router.patch(
  "/:session_id/end",
  requireFn(controller.endGameSession, "endGameSession")
);

// ----------------- Récup questions par session_id -----------------
router.get(
  "/:session_id/questions",
  requireFn(controller.getSessionQuestions, "getSessionQuestions")
);

// ----------------- Variante par code (chemin distinct) -----------------
router.get("/code/:code/questions", async (req, res) => {
  try {
    const { code } = req.params;
    const session = await GameSession.findOne({
      session_id: code,
      is_active: true,
    }).lean();

    if (!session) {
      return res.status(404).json({ message: "Session introuvable" });
    }

    const questions = await Question.find({ quiz_id: session.quiz_id }).lean();
    return res.json({ quiz_id: session.quiz_id, questions });
  } catch (err) {
    console.error("❌ Erreur get questions by session code :", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

module.exports = router;
