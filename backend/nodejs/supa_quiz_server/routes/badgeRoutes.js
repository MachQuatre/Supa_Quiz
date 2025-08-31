const express = require("express");
const router = express.Router();
const badgeController = require("../controllers/badgeController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

// 🔐 Attribuer un badge (admin ou super_user)
router.post(
  "/assign",
  authMiddleware,
  roleMiddleware("admin", "super_user"),
  badgeController.assignBadgeToUser
);

// 👤 Récupérer les badges de l’utilisateur connecté
router.get(
  "/me",
  authMiddleware,
  badgeController.getMyBadges
);

module.exports = router;
