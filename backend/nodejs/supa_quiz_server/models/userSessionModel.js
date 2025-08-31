// models/userSessionModel.js
const mongoose = require("mongoose");

const UUIDv4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* ---- Subschema ---- */
const questionPlayedSchema = new mongoose.Schema(
  {
    // ⚠️ was: required: true —> le rendre optionnel sinon /end plante si tu n'envoies pas les ids
    question_id: { type: String }, 
    answered: { type: Boolean, default: false },
    is_correct: { type: Boolean, default: false },
    response_time_ms: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    theme: { type: String },
  },
  { _id: false }
);

/* ---- UserSession ---- */
const userSessionSchema = new mongoose.Schema(
  {
    user_session_id: {
      type: String, required: true, unique: true, index: true,
      validate: { validator: (v) => UUIDv4.test(String(v)), message: "user_session_id doit être un UUIDv4." },
    },
    game_session_id: { type: String, index: true },

    user_id: {
      type: String, required: true, index: true,
      validate: { validator: (v) => UUIDv4.test(String(v)), message: "user_id doit être un UUIDv4 (users.user_id)." },
    },

    quiz_id: { type: String, required: true },

    // Horodatage
    start_time: { type: Date, default: Date.now, index: true },
    end_time:   { type: Date, index: true },

    // Scores
    score: { type: Number, default: 0, index: true },
    completion_percentage: { type: Number, default: 0 },

    // Métadonnées
    theme: { type: String },

    // ✅ Champs manquants (écrits par /end)
    status: { type: String, default: "active", index: true }, // "active" -> "ended"
    elapsed_ms: { type: Number },
    streak_max: { type: Number },

    // Détail des questions
    questions_played: { type: [questionPlayedSchema], default: [] },
  },
  { versionKey: false }
);

/* Normalisation légère */
userSessionSchema.pre("validate", function (next) {
  if (this.user_id != null) this.user_id = String(this.user_id).trim();
  if (this.user_session_id != null) this.user_session_id = String(this.user_session_id).trim();
  next();
});

/* Index utiles */
userSessionSchema.index({ user_id: 1, end_time: -1, start_time: -1 });

module.exports = mongoose.model("UserSession", userSessionSchema);
