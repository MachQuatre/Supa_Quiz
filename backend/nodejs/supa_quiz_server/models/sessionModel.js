const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
    session_id: { type: String, unique: true },
    user_id: { type: String, required: true },
    quiz_id: { type: String, required: true },
    start_time: { type: Date, default: Date.now },
    end_time: { type: Date },
    score: { type: Number, default: 0 },
    completion_percentage: { type: Number, default: 0 }
});

module.exports = mongoose.model("Session", sessionSchema);