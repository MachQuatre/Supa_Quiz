const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    score: { type: Number, required: true },
    questionnaire_id: { type: String, required: false },
    completion_percentage: { type: Number, required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
});

module.exports = mongoose.model("Session", SessionSchema);
