const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid"); // ✅ Ajoute ça

exports.signup = async (req, res) => {
    try {
      const { username, email, password, role } = req.body;
  
      const newUser = new User({
        user_id: uuidv4(), // ✅ Maintenant ça marche
        username,
        email,
        password,
        role
      });
  
      const savedUser = await newUser.save();
  
      res.status(201).json({
        message: "Utilisateur créé avec succès",
        user: {
          user_id: savedUser.user_id,
          username: savedUser.username,
          email: savedUser.email,
          role: savedUser.role
        }
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

        // ✅ Ajoute ici le cookie avec toutes les options pour développement
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "None", // ← important pour fetch cross-site
            secure: false     // ← car tu es probablement en HTTP
        });

        // ✅ Ensuite réponse JSON normale
        res.json({ message: "Connexion réussie", token, role: user.role });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        console.log("🟢 ID utilisateur à chercher :", req.user.user_id);
    
        const user = await User.findOne({ user_id: req.user.user_id }).select("-password");
    
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
    
        res.json(user);
    } catch (error) {
        console.error("❌ Erreur MongoDB :", error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
    
};
