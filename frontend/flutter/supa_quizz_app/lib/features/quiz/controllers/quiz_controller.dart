import '../../../core/models/question_model.dart';

class QuizController {
  int currentQuestionIndex = 0;
  int score = 0;
  bool quizFinished = false;

  Question get currentQuestion => questionsMock[currentQuestionIndex];

  void nextQuestion(int selectedAnswerIndex) {
    if (selectedAnswerIndex != -1 &&
        selectedAnswerIndex == currentQuestion.correctAnswerIndex) {
      score += 100; // Ajouter des points si bonne réponse
    }

    if (currentQuestionIndex < questionsMock.length - 1) {
      currentQuestionIndex++;
    } else {
      quizFinished =
          true; // Forcer la fin du quiz si c'était la dernière question
    }
  }

  void resetQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    quizFinished = false;
  }
}
