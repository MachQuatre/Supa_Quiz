const Quiz = require('../models/quizModel');
const Question = require('../models/questionModel');
const mongoose = require('mongoose');

const importQuestionnaire = async (req, res) => {
  try {
    const data = req.body;

    if (!data || !data.title || !Array.isArray(data.questions) || data.questions.length === 0) {
      return res.status(400).json({ error: 'JSON invalide : titre ou liste de questions manquants.' });
    }

    // Création manuelle d’un ObjectId pour le quiz
    const quizId = new mongoose.Types.ObjectId();

    // Création du quiz
    const newQuiz = new Quiz({
      _id: quizId,
      title: data.title,
      theme: data.theme || 'Général',
      difficulty: data.difficulty || 'moyen',
      question_count: data.questions.length,
      created_by: req.user.user_id,
    });

    await newQuiz.save();

    // Création des questions (avec save() au lieu de insertMany)
    for (const q of data.questions) {
      if (!q.content || !q.options || typeof q.answer !== 'number' || !q.theme) {
        throw new Error(`Chaque question doit contenir 'content', 'options', 'answer' et 'theme'.`);
      }

      const question = new Question({
        content: q.content,
        options: q.options,
        answer: q.answer,
        theme: q.theme,
        difficulty: q.difficulty || 'moyen',
        quiz_id: quizId, // 🛠️ assigné proprement
      });

      await question.save(); // ⚠️ insertMany peut ignorer les validations
    }

    return res.status(201).json({
      message: 'Quiz et questions importés avec succès.',
      quiz_id: quizId,
    });
  } catch (error) {
    console.error('Erreur lors de l\'importation du quiz :', error.message);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
};

module.exports = {
  importQuestionnaire,
};
