// Fichier : controllers/quizController.js

const Quiz = require('../models/quizModel');

// Obtenir tous les quiz
exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find();
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des quizzes', error });
  }
};

// Obtenir un quiz par son ID
exports.getQuizById = async (req, res) => {
  const { id } = req.params;
  try {
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz introuvable' });
    }
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du quiz', error });
  }
};

// Créer un nouveau quiz
exports.createQuiz = async (req, res) => {
  try {
    const newQuiz = new Quiz(req.body);
    const savedQuiz = await newQuiz.save();
    res.status(201).json(savedQuiz);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la création du quiz', error });
  }
};

// Mettre à jour un quiz
exports.updateQuiz = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedQuiz = await Quiz.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedQuiz) {
      return res.status(404).json({ message: 'Quiz introuvable' });
    }
    res.json(updatedQuiz);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour du quiz', error });
  }
};

// Supprimer un quiz
exports.deleteQuiz = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedQuiz = await Quiz.findByIdAndRemove(id);
    if (!deletedQuiz) {
      return res.status(404).json({ message: 'Quiz introuvable' });
    }
    res.json({ message: 'Quiz supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du quiz', error });
  }
};
