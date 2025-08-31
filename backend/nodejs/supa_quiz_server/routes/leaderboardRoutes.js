// routes/leaderboardRoutes.js
const express = require("express");
const router = express.Router();
const { getThemes, getGlobal, getByTheme } = require("../controllers/leaderboardController");

// Thèmes disponibles (dynamiques)
router.get("/themes", getThemes);

// Global (score_total depuis users)
router.get("/", getGlobal);

// Par thème (somme des scores UserSession.theme = :theme)
router.get("/theme/:theme", getByTheme);

module.exports = router;
