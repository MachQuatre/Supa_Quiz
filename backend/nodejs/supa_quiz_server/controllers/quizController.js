// controllers/quizController.js

exports.getAllQuizzes = async (req, res) => {
  // Pour tester, on peut juste renvoyer un JSON de base
  res.json({ message: 'Voici tous les quiz' });
};

exports.createQuiz = async (req, res) => {
  res.json({ message: 'Créer un quiz' });
};
