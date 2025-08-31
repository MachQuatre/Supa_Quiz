// controllers/leaderboardController.js
const User = require("../models/userModel");
const UserSession = require("../models/userSessionModel");

/* GET /api/leaderboard/themes
 * -> ["Histoire","Géographie",...]
 */
async function getThemes(req, res) {
  try {
    const themes = await UserSession.distinct("theme", { theme: { $ne: null } });
    // tri alpha et nettoyage
    const list = themes
      .map((t) => String(t).trim())
      .filter((t) => t.length > 0)
      .sort((a, b) => a.localeCompare(b, "fr"));
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: "Erreur listing thèmes", error: e.message || e });
  }
}

/* GET /api/leaderboard?limit=10
 * -> top 10 global depuis users.score_total
 */
async function getGlobal(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);
    const rows = await User.find(
      {},
      { _id: 0, user_id: 1, username: 1, avatar_choisi: 1, score_total: 1 }
    )
      .sort({ score_total: -1, username: 1 })
      .limit(limit)
      .lean();

    res.json(
      rows.map((u) => ({
        user_id: u.user_id,
        username: u.username || "Joueur",
        avatar: u.avatar_choisi || null,
        totalScore: u.score_total || 0,
      }))
    );
  } catch (e) {
    res.status(500).json({ message: "Erreur leaderboard global", error: e.message || e });
  }
}

/* GET /api/leaderboard/theme/:theme?limit=10
 * -> top 10 par thème (somme des scores UserSession.theme = :theme)
 */
async function getByTheme(req, res) {
  try {
    const theme = String(req.params.theme || "").trim();
    if (!theme) return res.status(400).json({ message: "theme requis" });

    const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);

    const agg = await UserSession.aggregate([
      { $match: { theme } },
      { $group: { _id: "$user_id", totalScore: { $sum: { $ifNull: ["$score", 0] } } } },
      { $sort: { totalScore: -1, _id: 1 } },
      { $limit: limit },
      // enrichir avec le profil utilisateur
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "user_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          user_id: "$_id",
          totalScore: 1,
          username: { $ifNull: ["$user.username", "Joueur"] },
          avatar: { $ifNull: ["$user.avatar_choisi", null] },
          _id: 0,
        },
      },
    ]);

    res.json(agg);
  } catch (e) {
    res.status(500).json({ message: "Erreur leaderboard par thème", error: e.message || e });
  }
}

module.exports = { getThemes, getGlobal, getByTheme };
