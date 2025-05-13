const UserSession = require("../models/userSessionModel");
const { v4: uuidv4 } = require("uuid");

exports.createUserSession = async (req, res) => {
  try {
    const { user_id, game_session_id } = req.body;

    const session = new UserSession({
      user_session_id: uuidv4(),
      user_id,
      game_session_id,
    });

    await session.save();
    res.status(201).json({ message: "UserSession démarrée", session });
  } catch (error) {
    res.status(500).json({ message: "Erreur création UserSession", error });
  }
};

exports.updateUserSession = async (req, res) => {
  try {
    const { user_session_id } = req.params;
    const { questions_played, score, completion_percentage, end_time } = req.body;

    const updated = await UserSession.findOneAndUpdate(
      { user_session_id },
      {
        questions_played,
        score,
        completion_percentage,
        end_time: end_time || new Date()
      },
      { new: true }
    );

    res.status(200).json({ message: "UserSession mise à jour", session: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour", error });
  }
};

exports.getUserSessions = async (req, res) => {
  try {
    const { user_id } = req.params;
    const sessions = await UserSession.find({ user_id });
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération sessions", error });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const { user_session_id } = req.params;
    const { question_id, is_correct, response_time_ms } = req.body;

    const session = await UserSession.findOne({ user_session_id });
    if (!session) {
      return res.status(404).json({ message: "UserSession introuvable" });
    }

    // Ajout d'une entrée à questions_played
    session.questions_played.push({
      question_id,
      answered: true,
      is_correct,
      response_time_ms
    });

    // Mise à jour du score (ex : +10 points si bonne réponse)
    if (is_correct) session.score += 10;

    // Mise à jour de la complétion
    const totalAnswered = session.questions_played.length;
    session.completion_percentage = totalAnswered * 10; // ex : 10 questions max = 100%

    await session.save();

    res.status(200).json({
      message: "✅ Réponse enregistrée",
      score: session.score,
      completion: session.completion_percentage,
      session
    });
  } catch (error) {
    console.error("❌ Erreur dans submitAnswer :", error);
    res.status(500).json({ message: "Erreur soumission réponse", error });
  }
};
