const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({
    response_id: { type: String, unique: true },
    session_id: { type: String, required: true },
    question_id: { type: String, required: true },
    user_response: { type: String, required: true },
    is_correct: { type: Boolean, required: true },
    response_time: { type: Number, required: true }
});

module.exports = mongoose.model("Response", responseSchema);