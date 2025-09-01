// controllers/authController.js
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

exports.signup = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    const newUser = new User({
      user_id: uuidv4(), // ✅ UUID v4
      username,
      email,
      password,
      role,
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: {
        user_id: savedUser.user_id,
        username: savedUser.username,
        email: savedUser.email,
        role: savedUser.role,
        avatar_choisi: savedUser.avatar_choisi,
        achievement_state: savedUser.achievement_state,
        score_total: savedUser.score_total, // ✅ renvoyé dès la création
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'inscription :", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Utilisateur non trouvé." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Mot de passe incorrect." });


    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "None",
      secure: false,
    });

    res.json({
      message: "Connexion réussie",
      token,
      role: user.role,
      user_id: user.user_id,
      username: user.username,
      avatar_choisi: user.avatar_choisi,
      achievement_state: user.achievement_state,
      score_total: user.score_total,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// endpoint /auth/me ou /profile
exports.getUserProfile = async (req, res) => {
  try {
    console.log("🟢 ID utilisateur à chercher :", req.user.user_id);

    const me = await User.findOne(
      { user_id: req.user.user_id },
      {
        _id: 0,
        user_id: 1,
        username: 1,
        email: 1,
        role: 1,
        avatar_choisi: 1,
        score_total: 1,
        achievement_state: 1,
      }
    ).lean();

    if (!me) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json(me);
  } catch (error) {
    console.error("❌ Erreur MongoDB :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
