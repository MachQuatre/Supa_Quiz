const express = require("express");
const router = express.Router();
const GameSession = require("../models/gameSessionModel");
const Quiz = require("../models/quizModel");
const gameSessionController = require("../controllers/gameSessionController");

// POST /api/game-sessions
router.post("/", gameSessionController.createGameSession);

// GET /api/game-sessions/active
router.get("/active", async (req, res) => {
  try {
    const sessions = await GameSession.find({ is_active: true }).lean();

    const quizMap = {};
    for (const session of sessions) {
      if (!quizMap[session.quiz_id]) {
        const quiz = await Quiz.findOne({ quiz_id: session.quiz_id });
        quizMap[session.quiz_id] = quiz ? quiz.title : "Quiz inconnu";
      }
      session.quiz_title = quizMap[session.quiz_id];
    }

    const result = sessions.map(s => ({
      code: s.session_id,
      quiz_title: s.quiz_title,
      duration: s.duration_minutes,
      start_time: s.created_at,
      participants: s.participants || []
    }));

    res.json(result);
  } catch (err) {
    console.error("Erreur sessions actives :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.patch('/:session_id/end', gameSessionController.endGameSession);

router.get("/:session_id/questions", gameSessionController.getSessionQuestions);

module.exports = router;
