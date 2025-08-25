const UserSession = require("../models/userSessionModel");

// 📌 Leaderboard global + rang utilisateur connecté
exports.getGlobalLeaderboard = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const leaderboard = await UserSession.aggregate([
      {
        $group: {
          _id: "$user_id",
          totalScore: { $sum: "$score" }
        }
      },
      { $sort: { totalScore: -1 } }
    ]);

    const top10 = leaderboard.slice(0, 10);

    const userRank = leaderboard.findIndex(user => user._id === user_id) + 1;

    res.status(200).json({
      top10,
      myRank: userRank > 0 ? userRank : null
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur leaderboard global", error: err });
  }
};

// 📌 Leaderboard par thème + rang utilisateur connecté
exports.getLeaderboardByTheme = async (req, res) => {
  try {
    const { theme } = req.params;
    const user_id = req.user.user_id;

    const leaderboard = await UserSession.aggregate([
      { $match: { theme } },
      {
        $group: {
          _id: "$user_id",
          totalScore: { $sum: "$score" }
        }
      },
      { $sort: { totalScore: -1 } }
    ]);

    const top10 = leaderboard.slice(0, 10);

    const userRank = leaderboard.findIndex(user => user._id === user_id) + 1;

    res.status(200).json({
      theme,
      top10,
      myRank: userRank > 0 ? userRank : null
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur leaderboard par thème", error: err });
  }
};
