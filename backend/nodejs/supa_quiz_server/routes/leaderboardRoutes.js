const express = require("express");
const router = express.Router();
const leaderboardController = require("../controllers/leaderboardController");
const authMiddleware = require('../middlewares/authMiddleware');

router.get("/global", authMiddleware, leaderboardController.getGlobalLeaderboard);
router.get("/theme/:theme", authMiddleware, leaderboardController.getLeaderboardByTheme);
//router.get("/me", authMiddleware, leaderboardController.getMyGlobalScore);

module.exports = router;
