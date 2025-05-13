const mongoose = require("mongoose");

const gameSessionSchema = new mongoose.Schema({
  session_id: { type: String, unique: true },
  host_id: { type: String, required: true },
  quiz_id: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  participants: [String],
  duration_minutes: { type: Number} // ⏱️ durée personnalisable
});

module.exports = mongoose.model("GameSession", gameSessionSchema);
