const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
    quiz_id: { type: String, unique: true, required: true }, // ✅ Assurez-vous que c'est un String et non ObjectId
    title: { type: String, required: true },
    theme: { type: String, required: true },
    difficulty: { type: String, enum: ["facile", "moyen", "difficile"], required: true },
    question_count: { type: Number, required: true },
    creation_date: { type: Date, default: Date.now },
    created_by: { type: String, required: true },
});

module.exports = mongoose.model("Quiz", quizSchema);