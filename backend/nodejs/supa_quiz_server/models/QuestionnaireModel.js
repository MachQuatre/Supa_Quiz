const mongoose = require("mongoose");

const questionnaireSchema = new mongoose.Schema({
  questionnaire_id: String,
  title: String,
  theme: String,
  difficulty_level: String,
  creation_date: Date,
  question_count: Number
});

module.exports = mongoose.model("Questionnaire", questionnaireSchema, "Questionnaires"); 
// ⚠️ Ici "Questionnaires" doit être exactement comme dans Compass
