const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema({
  badge_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  criteria: { type: String }
});

module.exports = mongoose.models.Badge || mongoose.model("Badge", badgeSchema);
