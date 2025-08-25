const mongoose = require("mongoose");

const userBadgeSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  badge_id: { type: String, required: true },
  date_awarded: { type: Date, default: Date.now }
});

module.exports = mongoose.models.UserBadge || mongoose.model("UserBadge", userBadgeSchema);
