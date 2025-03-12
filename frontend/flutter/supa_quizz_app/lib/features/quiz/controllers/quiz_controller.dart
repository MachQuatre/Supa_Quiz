import '../../../core/models/question_model.dart';

class QuizController {
  int currentQuestionIndex = 0;
  int score = 0;
  bool quizFinished = false;

  Question get currentQuestion => questionsMock[currentQuestionIndex];

  void nextQuestion(int selectedAnswerIndex, int timeRemaining) {
    if (selectedAnswerIndex != -1 &&
        selectedAnswerIndex == currentQuestion.correctAnswerIndex) {
      int points = 10 -
          (10 - timeRemaining); // Calcul du score basé sur le temps restant
      if (points < 1)
        points = 1; // Minimum 1 point pour éviter un score négatif
      score += points;
    }

    if (currentQuestionIndex < questionsMock.length - 1) {
      currentQuestionIndex++;
    } else {
      quizFinished = true; // Fin du quiz
    }
  }

  void resetQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    quizFinished = false;
  }
}
