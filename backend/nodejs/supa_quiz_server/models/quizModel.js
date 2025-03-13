// Fichier : models/quizModel.js

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [String],       // Liste de choix
  answerIndex: Number,     // Index de la réponse correcte dans options
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [questionSchema], // On inclut directement un sous-schema
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Quiz', quizSchema);
