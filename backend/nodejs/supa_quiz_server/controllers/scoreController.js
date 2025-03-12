// controllers/scoreController.js

const Session = require('../models/sessionModel');

// 1) Créer / Enregistrer un score
exports.createUserScore = async (req, res) => {
  try {
    // Flutter envoie un body JSON, par ex:
    // {
    //   "user_id": "123",
    //   "questionnaire_id": "abc",
    //   "score": 85,
    //   "session_id": "xyz",
    //   ...
    // }
    const newSession = new Session(req.body);
    const savedSession = await newSession.save();

    return res.status(201).json({
      message: 'Score enregistré avec succès',
      session: savedSession,
    });
  } catch (error) {
    console.error('Erreur lors de la création du score :', error);
    return res.status(500).json({ message: 'Erreur serveur', error });
  }
};

// 2) (Optionnel) Récupérer toutes les sessions (scores) pour test/inspection
exports.getAllScores = async (req, res) => {
  try {
    const allSessions = await Session.find(); // Ramène toute la collection
    return res.json(allSessions);
  } catch (error) {
    console.error('Erreur lors de la récupération des scores :', error);
    return res.status(500).json({ message: 'Erreur serveur', error });
  }
};
