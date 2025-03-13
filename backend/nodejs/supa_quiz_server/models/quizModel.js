const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
    quiz_id: { type: String, unique: true },
    title: { type: String, required: true },
    theme: { type: String, required: true },
    difficulty: { type: String, enum: ["facile", "moyen", "difficile"], required: true },
    question_count: { type: Number, required: true },
    creation_date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Quiz", quizSchema);