// controllers/userController.js
const User = require("../models/userModel");
const Response = require("../models/responseModel");
const multer = require("multer");
const path = require("path");

/**
 * TOTAL SCORE
 * Somme des meilleurs scores par quiz (meilleur score pour chaque quiz).
 */
exports.getTotalScore = async (req, res) => {
  try {
    const { user_id } = req.params;

    const scores = await Response.aggregate([
      { $match: { user_id } },
      { $group: { _id: "$quiz_id", bestScore: { $max: "$score" } } },
      { $group: { _id: null, total: { $sum: "$bestScore" } } }
    ]);

    res.json({ totalScore: scores[0]?.total || 0 });
  } catch (err) {
    console.error("❌ Erreur getTotalScore :", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/**
 * HISTORY (10 dernières parties)
 * Renvoie: quiz_title, score, created_at, quiz_id
 * Trie par date décroissante, limite à 10.
 */
// 📌 Historique des 10 dernières parties avec titre du quiz
exports.getHistory = async (req, res) => {
  try {
    const { user_id } = req.params;

    const history = await Response.aggregate([
      { $match: { user_id } }, // filtre par utilisateur
      {
        $lookup: {
          from: "quizzes",          // nom de ta collection Quiz
          localField: "quiz_id",    // champ dans Response
          foreignField: "quiz_id",  // champ dans Quiz
          as: "quiz"
        }
      },
      { $unwind: { path: "$quiz", preserveNullAndEmptyArrays: true } }, // évite crash si quiz introuvable
      { $sort: { created_at: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          quiz_title: { $ifNull: ["$quiz.title", "Quiz inconnu"] }, // fallback si null
          score: { $ifNull: ["$score", 0] }, // évite null score
          created_at: 1
        }
      }
    ]);

    res.json(history);
  } catch (err) {
    console.error("❌ Erreur getHistory :", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};


/**
 * UPLOAD photo de profil (si tu l'utilises)
 */
exports.uploadPhoto = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!req.file) return res.status(400).json({ message: "Aucun fichier envoyé" });

    const photoPath = `/uploads/${req.file.filename}`;
    await User.updateOne({ user_id }, { photo: photoPath });

    res.json({ message: "Photo mise à jour", photo: photoPath });
  } catch (err) {
    console.error("❌ Erreur uploadPhoto :", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

/**
 * PATCH /api/users/:user_id/avatar
 * Met à jour l'avatar choisi (valeur: chemin asset ou URL).
 */
exports.updateAvatar = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { avatar } = req.body;

    if (!avatar) return res.status(400).json({ message: "Avatar manquant" });

    const user = await User.findOneAndUpdate(
      { user_id },
      { avatar_choisi: avatar },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    res.json({ message: "Avatar mis à jour", avatar_choisi: user.avatar_choisi });
  } catch (err) {
    console.error("❌ Erreur updateAvatar:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * PATCH /api/users/:user_id/achievement
 */
exports.updateAchievement = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { achievement } = req.body;

    if (!achievement) return res.status(400).json({ message: "achievement manquant" });

    const user = await User.findOneAndUpdate(
      { user_id },
      { achievement_state: achievement },
      { new: true }
    ).lean();

    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json({
      message: "Achievement mis à jour",
      achievement_state: user.achievement_state
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

/**
 * GET /api/users/:user_id/achievement
 */
exports.getAchievement = async (req, res) => {
  try {
    const { user_id } = req.params;
    const user = await User.findOne({ user_id }, { achievement_state: 1, _id: 0 }).lean();

    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json({ achievement_state: user.achievement_state });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};
