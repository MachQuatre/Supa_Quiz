const mongoose = require("mongoose");

/** Sous-doc pour une question jouée (flux type Game/Kahoot) */
const QuestionPlayedSchema = new mongoose.Schema(
  {
    question_id: { type: String },          // id applicatif
    answered: { type: Boolean, default: true },
    is_correct: { type: Boolean, default: false },
    response_time_ms: { type: Number },
    score: { type: Number },
    theme: { type: String },
  },
  { _id: false }
);

/**
 * Modèle "UserSession" polymorphe :
 * - Mode GameSession (partie complète): user_session_id, game_session_id, quiz_id, questions_played[], score...
 * - Mode Training (événement léger): user_id, question_id, theme, difficulty, correct, response_time_ms, source
 *   (les champs GameSession restent optionnels)
 */
const UserSessionSchema = new mongoose.Schema(
  {
    /* ---- Identifiants communs ---- */
    user_id: { type: String, required: true, index: true },

    /* ---- Mode GameSession (partie structurée) ---- */
    user_session_id: { type: String, index: true }, // UUID public de la session
    game_session_id: { type: String },
    quiz_id: { type: String },
    status: {
      type: String,
      enum: ["started", "ended", "abandoned"],
      default: "started",
    },
    start_time: { type: Date, default: Date.now },
    end_time: { type: Date },

    questions_played: { type: [QuestionPlayedSchema], default: [] },
    score: { type: Number, default: 0 },
    completion_percentage: { type: Number, default: 0 },
    elapsed_ms: { type: Number },
    streak_max: { type: Number },

    /* ---- Attributs communs / analytiques ---- */
    theme: { type: String, index: true },
    difficulty: { type: String },

    /* ---- Mode Training (événement léger, 1 question) ---- */
    question_id: { type: String },          // pour l’événement d’entraînement
    correct: { type: Boolean },
    response_time_ms: { type: Number },
    source: { type: String, default: "training", index: true }, // training|quiz|...
  },
  {
    timestamps: true,                // createdAt / updatedAt
    collection: "usersessions",      // conserve ta collection existante
  }
);

/** Garde-fous légers */
UserSessionSchema.pre("validate", function (next) {
  if (!this.status) this.status = "started";
  if (!this.start_time) this.start_time = new Date();
  if (!Array.isArray(this.questions_played)) this.questions_played = [];
  if (this.user_id != null) this.user_id = String(this.user_id).trim();
  if (this.user_session_id != null) this.user_session_id = String(this.user_session_id).trim();
  next();
});

/** Index utiles (coexistent) */
UserSessionSchema.index({ user_session_id: 1 });
UserSessionSchema.index({ user_id: 1 });
UserSessionSchema.index({ user_id: 1, theme: 1, createdAt: -1 });
UserSessionSchema.index({ user_id: 1, end_time: -1, start_time: -1 }); // pour listes récentes

module.exports = mongoose.model("UserSession", UserSessionSchema);
