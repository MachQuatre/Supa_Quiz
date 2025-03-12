// routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

// GET: Récupérer tous les quiz
router.get('/', quizController.getAllQuizzes);

// POST: Créer un quiz
router.post('/', quizController.createQuiz);

// On exporte le *router*, pas le contrôleur
module.exports = router;
