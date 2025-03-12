// models/sessionModel.js

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  session_id: String,
  user_id: String,
  questionnaire_id: String,
  score: Number,
  start_time: Date,
  end_time: Date,
  // Ajoute ici tous les champs qui existent déjà dans ta collection "Sessions"
});

module.exports = mongoose.model('Session', sessionSchema, 'Sessions');
// Le 3e paramètre force le nom "Sessions" si c'est celui de ta collection
