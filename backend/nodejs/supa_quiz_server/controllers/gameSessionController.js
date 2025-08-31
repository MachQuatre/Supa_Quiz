// controllers/gameSessionController.js
const GameSession = require("../models/gameSessionModel");
const Quiz = require("../models/quizModel");
const Question = require("../models/questionModel"); // indispensable pour /questions
const User = require("../models/userModel");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const UserSession = require("../models/userSessionModel");
const mongoose = require("mongoose");

/* ------------------ helpers ------------------ */
const isObjectId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
const isUUIDv4 = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

function generateSessionCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/* ------------------ Créer une session de jeu ------------------ */
async function createGameSession(req, res) {
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
}

/* ------------------ Rejoindre une session (+ création UserSession) ------------------ */
async function joinGameSession(req, res) {
  try {
    const { session_id } = req.params;

    // Source identité → users.user_id (UUID)
    const rawFromAuth = req.user && (req.user.user_id || req.user.id);
    const rawFromBody = req.body && req.body.user_id;
    if (!rawFromAuth && !rawFromBody) {
      return res.status(400).json({ message: "user_id requis" });
    }

    let userUuid = String(rawFromAuth || rawFromBody).trim();

    // Si on reçoit un _id Mongo → mapper vers users.user_id (UUID)
    if (isObjectId(userUuid)) {
      const u = await User.findById(userUuid, { user_id: 1 }).lean();
      if (!u || !u.user_id) {
        return res.status(400).json({ message: "Utilisateur introuvable pour cet _id" });
      }
      userUuid = String(u.user_id);
    }

    if (!isUUIDv4(userUuid)) {
      return res.status(400).json({ message: "user_id doit être un UUIDv4 (users.user_id)" });
    }

    // Récupérer la GameSession
    const session = await GameSession.findOne({ session_id });
    if (!session || !session.is_active) {
      return res.status(404).json({ message: "Session introuvable ou terminée" });
    }

    // Ajouter l'utilisateur (UUID) dans participants
    if (!Array.isArray(session.participants)) session.participants = [];
    if (!session.participants.includes(userUuid)) {
      session.participants.push(userUuid);
      await session.save();
    }

    // ------- Récupération sûre du thème du quiz -------
    const quizId = session.quiz_id;
    let quizDoc = null;

    // quiz_id peut être un UUID (string) ou un ObjectId stocké en string selon ton modèle
    if (quizId && mongoose.isValidObjectId(quizId)) {
      quizDoc = await Quiz.findById(quizId, { theme: 1 }).lean();
    }
    if (!quizDoc) {
      quizDoc = await Quiz.findOne({ quiz_id: String(quizId) }, { theme: 1 }).lean();
    }

    const theme = quizDoc?.theme ?? null;
    // -----------------------------------------------

    // Créer la UserSession (si non existante) avec le theme bien renseigné
    let userSession = await UserSession.findOne({
      game_session_id: session_id,
      user_id: userUuid,
    });

    if (!userSession) {
      userSession = new UserSession({
        user_session_id: uuidv4(), // UUID public de la session utilisateur
        user_id: userUuid,         // toujours l'UUID users.user_id
        game_session_id: session_id,
        quiz_id: session.quiz_id,
        score: 0,
        theme,                     // ✅ on met le thème ici
      });
      await userSession.save();
    }

    return res.status(200).json({
      message: "Utilisateur ajouté et UserSession créée",
      session,
      userSession,
    });
  } catch (error) {
    console.error("❌ Erreur ajout participant :", error);
    return res.status(500).json({
      message: "Erreur ajout participant",
      error: error.message || error,
    });
  }
}

/* ------------------ Clôturer une session ------------------ */
async function endGameSession(req, res) {
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
}

/* ------------------ Récupérer les questions de la session ------------------ */
async function getSessionQuestions(req, res) {
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
      error: error.message || "Erreur inconnue",
    });
  }
}

module.exports = {
  createGameSession,
  joinGameSession,
  endGameSession,
  getSessionQuestions,
};
