const UserBadge = require("../models/userBadgeModel");
const Badge = require("../models/badgeModel");

// ✅ Attribution manuelle d’un badge à un utilisateur
exports.assignBadgeToUser = async (req, res) => {
  try {
    const { user_id, badge_id } = req.body;

    if (!user_id || !badge_id) {
      return res.status(400).json({ error: "user_id et badge_id sont requis." });
    }

    const badge = await Badge.findOne({ badge_id });
    if (!badge) {
      return res.status(404).json({ error: "Badge non trouvé." });
    }

    const alreadyAssigned = await UserBadge.findOne({ user_id, badge_id });
    if (alreadyAssigned) {
      return res.status(409).json({ error: "Badge déjà attribué à cet utilisateur." });
    }

    const userBadge = new UserBadge({ user_id, badge_id });
    await userBadge.save();

    res.status(201).json({ message: "Badge attribué avec succès.", userBadge });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erreur serveur" });
  }
};

// ✅ Voir les badges de l’utilisateur connecté
exports.getMyBadges = async (req, res) => {
  try {
    const badges = await UserBadge.find({ user_id: req.user.user_id });
    res.status(200).json(badges);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erreur serveur" });
  }
};
