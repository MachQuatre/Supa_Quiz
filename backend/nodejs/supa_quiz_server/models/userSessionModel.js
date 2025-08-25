const mongoose = require("mongoose");

const userSessionSchema = new mongoose.Schema({
  user_session_id: { type: String, unique: true },
  game_session_id: { type: String, required: true },
  user_id: { type: String, required: true },
  start_time: { type: Date, default: Date.now },
  end_time: { type: Date },
  score: { type: Number, default: 0 },
  completion_percentage: { type: Number, default: 0 },
  theme: { type: String }, // ✅ nouveau champ ici
  questions_played: [
  {
    question_id: String,
    answered: Boolean,
    is_correct: Boolean,
    response_time_ms: Number,
    score: Number,         // ✅ (si calculé côté Flutter)
    theme: String          // ✅ pour permettre le leaderboard par thème
  }
]
});

module.exports = mongoose.model("UserSession", userSessionSchema);
