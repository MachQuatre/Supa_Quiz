// Fichier : routes/quizRoutes.js

const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

// GET - Récupérer tous les quiz
router.get('/', quizController.getAllQuizzes);

// GET - Récupérer un quiz par son ID
router.get('/:id', quizController.getQuizById);

// POST - Créer un nouveau quiz
router.post('/', quizController.createQuiz);

// PUT - Mettre à jour un quiz
router.put('/:id', quizController.updateQuiz);

// DELETE - Supprimer un quiz
router.delete('/:id', quizController.deleteQuiz);

module.exports = router;
