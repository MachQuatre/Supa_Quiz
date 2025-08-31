const { v4: uuidv4 } = require("uuid");
const UserSession = require("../models/userSessionModel");
const Questionnaire = require("../models/questionnaireModel");
const User = require("../models/userModel");

async function createSession(req, res) {
  try {
    const userUUID = (req.user && (req.user.user_id || req.user.id)) || null;
    if (!userUUID) return res.status(401).json({ error: "Authentification requise" });

    const { questionnaireId } = req.body;
    if (!questionnaireId) return res.status(400).json({ error: "questionnaireId requis" });

    const qz = await Questionnaire.findById(questionnaireId);
    if (!qz) return res.status(404).json({ error: "Questionnaire introuvable" });

    const us = await UserSession.create({
      user_session_id: uuidv4(),
      user_id: String(userUUID),
      quiz_id: String(qz._id),    // réutilise le champ existant
      theme: qz.theme,
      start_time: new Date(),
      questions_played: [],
      score: 0,
    });

    const questions = qz.snapshot.map((s, i) => ({
      index: i, text: s.text, options: s.options, correctIndex: s.correctIndex,
    }));

    res.status(201).json({
      userSessionId: us.user_session_id,
      themeId: qz.theme,
      questions,
    });
  } catch (e) {
    console.error("❌ createSession error:", e);
    res.status(500).json({ error: "Impossible de créer la session" });
  }
}

async function finishSession(req, res) {
  try {
    const { userSessionId } = req.params;
    const { answers, score_total, elapsedMs, strikes, streakMax } = req.body;

    const session = await UserSession.findOne({ user_session_id: userSessionId });
    if (!session) return res.status(404).json({ error: "Session introuvable" });
    if (session.end_time) return res.status(400).json({ error: "Session déjà terminée" });

    const qz = await Questionnaire.findById(session.quiz_id);
    if (!qz) return res.status(404).json({ error: "Questionnaire introuvable" });

    // Fallback si le score n’est pas fourni: 1 pt par bonne réponse
    let computed = 0;
    (qz.snapshot || []).forEach((s, i) => {
      if (answers && answers[i] === s.correctIndex) computed += 1;
    });

    const finalScore = Number.isFinite(score_total) ? Number(score_total) : computed;

    // (optionnel) enregistrer le détail des questions jouées
    const questions_played = (qz.snapshot || []).map((s, i) => ({
      question_id: s.question_id || String(i),
      answered: typeof answers?.[i] === "number" && answers[i] >= 0,
      is_correct: answers?.[i] === s.correctIndex,
      response_time_ms: 0,
      score: answers?.[i] === s.correctIndex ? 1 : 0, // score par item (pas le total)
      theme: qz.theme,
    }));

    session.questions_played = questions_played;
    session.score = finalScore;
    session.end_time = new Date();
    await session.save();

    await User.updateOne({ user_id: session.user_id }, { $inc: { score_total: finalScore } });
    const user = await User.findOne({ user_id: session.user_id }, { score_total: 1 });

    const durationSec = session.start_time ? Math.floor((session.end_time - session.start_time) / 1000) : 0;
    return res.json({
      userSessionId,
      score: finalScore,                 // ✅ renvoie le vrai score
      total_score: user?.score_total ?? 0,
      durationSec,
    });
  } catch (e) {
    console.error("❌ finishSession error:", e);
    res.status(500).json({ error: "Erreur lors de la finalisation de la session" });
  }
}


module.exports = { createSession, finishSession };
