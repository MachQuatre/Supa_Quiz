// models/gameSessionModel.js
const mongoose = require("mongoose");

const gameSessionSchema = new mongoose.Schema(
  {
    // Identifiant lisible de session (code partagé aux joueurs)
    session_id: { type: String, unique: true, index: true },

    // Hôte de la partie (user qui lance le quiz)
    host_id: { type: String, required: true, index: true },

    // Référence vers le quiz joué
    quiz_id: { type: String, required: true, index: true },

    // Statut de la session
    is_active: { type: Boolean, default: true, index: true },

    // Date de création
    created_at: { type: Date, default: Date.now, index: true },

    // Date d’expiration automatique (grâce à durée + sursis)
    expires_at: { type: Date, index: true },   // 👈 ajouté

    // Liste des participants (stockés en user_id string)
    participants: { type: [String], default: [] },

    // Durée paramétrable de la partie (minutes)
    duration_minutes: { type: Number },
  },
  { versionKey: false }
);

// Index combiné utile si tu listes rapidement les sessions d’un host
gameSessionSchema.index({ host_id: 1, created_at: -1 });

module.exports = mongoose.model("GameSession", gameSessionSchema);
