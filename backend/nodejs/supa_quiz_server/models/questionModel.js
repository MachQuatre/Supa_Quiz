const mongoose = require("mongoose");
const questionSchema = new mongoose.Schema({
    question_id: { type: String, unique: true },
    quiz_id: { type: String, required: true },
    question_text: { type: String, required: true },
    answer_options: [{ type: String, required: true }], 
    correct_answer: { type: String, required: true },
    difficulty: { type: String, enum: ["facile", "moyen", "difficile"], required: true },
    theme: { type: String, required: true }
});
module.exports = mongoose.model("Question", questionSchema);