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
const UserSessionSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  question_id: { type: String, required: true },
  theme: { type: String, required: true, index: true },
  difficulty: { type: String }, // accepte ce que tu envoies
  correct: { type: Boolean, required: true },
  response_time_ms: { type: Number },
  source: { type: String, default: "training", index: true }, // training|quiz|...
}, { timestamps: true, collection: "usersessions" });


/* Normalisation légère */
userSessionSchema.pre("validate", function (next) {
  if (this.user_id != null) this.user_id = String(this.user_id).trim();
  if (this.user_session_id != null) this.user_session_id = String(this.user_session_id).trim();
  next();
});

/* Index utiles */
userSessionSchema.index({ user_id: 1, end_time: -1, start_time: -1 });

module.exports = mongoose.model("UserSession", userSessionSchema);
