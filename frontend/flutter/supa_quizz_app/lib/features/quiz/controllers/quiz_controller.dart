import '../../../core/models/question_model.dart';

class QuizController {
  int currentQuestionIndex = 0;
  bool quizFinished = false;

  Question get currentQuestion => questionsMock[currentQuestionIndex];

  void nextQuestion() {
    if (currentQuestionIndex < questionsMock.length - 1) {
      currentQuestionIndex++;
    } else {
      quizFinished = true; // Le quiz est terminé
    }
  }

  void resetQuiz() {
    currentQuestionIndex = 0;
    quizFinished = false;
  }
}
