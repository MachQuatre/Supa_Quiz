const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware"); // Ajout de l'import

// Routes d'authentification
router.post("/signup", authController.signup);
router.post("/login", authController.login);

// Route protégée - Profil utilisateur
router.get("/me", authMiddleware, authController.getUserProfile);

module.exports = router;
