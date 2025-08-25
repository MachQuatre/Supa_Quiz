const GameSession = require("../models/gameSessionModel");
const Quiz = require("../models/quizModel");
const Question = require("../models/questionModel"); // ✅ celui-ci est indispensable
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");


// Génère un code de session aléatoire
function generateSessionCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ✅ Créer une session de jeu
exports.createGameSession = async (req, res) => {
  try {
    const { host_id, quiz_id, duration_minutes } = req.body;

    const code = generateSessionCode();
    const sessionDuration = Number(duration_minutes) || 5;
    const gracePeriodMinutes = 3;
    const totalDurationMinutes = sessionDuration + gracePeriodMinutes;
    const expirationDate = new Date(Date.now() + totalDurationMinutes * 60000);

    const newSession = new GameSession({
      session_id: code,
      host_id,
      quiz_id,
      duration_minutes: sessionDuration,
      participants: [],
      expires_at: expirationDate,
    });

    await newSession.save();

    logger.info(`🟢 Session ${code} créée par ${host_id} pour le quiz ${quiz_id}`);
    logger.info(`🕒 Clôture auto prévue dans ${totalDurationMinutes} minutes (sursis inclus)`);

    setTimeout(async () => {
      const session = await GameSession.findOne({ session_id: code });

      if (session && session.is_active) {
        await GameSession.findOneAndUpdate({ session_id: code }, { is_active: false });
        logger.warn(`⏱️ Session ${code} désactivée automatiquement après sursis`);
      } else {
        logger.info(`✅ Session ${code} déjà clôturée manuellement`);
      }
    }, totalDurationMinutes * 60000);

    res.status(201).json({ message: "Session créée", session: newSession });

  } catch (error) {
    logger.error(`❌ Erreur création session : ${error.message}`);
    res.status(500).json({ message: "Erreur création session", error });
  }
};

// ✅ Rejoindre une session de jeu
exports.joinGameSession = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { user_id } = req.body;

    const session = await GameSession.findOne({ session_id });

    if (!session || !session.is_active) {
      return res.status(404).json({ message: "Session introuvable ou terminée" });
    }

    if (!session.participants.includes(user_id)) {
      session.participants.push(user_id);
      await session.save();
    }

    res.status(200).json({ message: "Utilisateur ajouté à la session", session });
  } catch (error) {
    logger.error(`❌ Erreur ajout participant : ${error.message}`);
    res.status(500).json({ message: "Erreur ajout participant", error });
  }
};

// ✅ Clôturer une session de jeu
exports.endGameSession = async (req, res) => {
  try {
    const { session_id } = req.params;

    const session = await GameSession.findOneAndUpdate(
      { session_id },
      { is_active: false },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: "Session introuvable" });
    }

    logger.info(`🔚 Session ${session_id} clôturée manuellement`);
    res.status(200).json({ message: "Session clôturée avec succès", session });
  } catch (error) {
    logger.error(`❌ Erreur clôture session : ${error.message}`);
    res.status(500).json({ message: "Erreur clôture session", error });
  }
};

exports.getSessionQuestions = async (req, res) => {
  try {
    const { session_id } = req.params;

    const session = await GameSession.findOne({ session_id });
    if (!session) {
      return res.status(404).json({ message: "Session introuvable" });
    }

    const quizId = session.quiz_id;
    if (!quizId) {
      return res.status(400).json({ message: "La session n'a pas de quiz associé" });
    }

    const questions = await Question.find({ quiz_id: quizId });

    res.status(200).json({ quiz_id: quizId, questions });
  } catch (error) {
    console.error("❌ Erreur récupération questions :", error);
    res.status(500).json({
      message: "Erreur récupération questions",
      error: error.message || "Erreur inconnue"
    });
  }
};