const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ message: "Accès refusé, token manquant" });
    }

    try {
        const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
        console.log("🔍 Token décodé:", decoded);

        req.user = decoded;  // ✅ Associe l'utilisateur au `req.user`
        console.log("🟢 Utilisateur extrait du token :", req.user);

        next();
    } catch (error) {
        console.error("❌ Erreur de vérification du token:", error);
        res.status(401).json({ message: "Token invalide" });
    }
};
