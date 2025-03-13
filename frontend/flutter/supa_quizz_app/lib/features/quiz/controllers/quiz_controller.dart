import '../../../core/models/question_model.dart';

class QuizController {
  int currentQuestionIndex = 0;
  int score = 0;
  bool quizFinished = false;
  List<Question> questions = [];

  // Questions classées par thème
  final Map<String, List<Question>> questionsByTheme = {
    "Général": [
      Question(
          question: "Quel est le plus grand océan ?",
          options: ["Atlantique", "Pacifique", "Indien", "Arctique"],
          correctAnswerIndex: 1),
      Question(
          question: "Quelle est la capitale du Japon ?",
          options: ["Pékin", "Séoul", "Tokyo", "Bangkok"],
          correctAnswerIndex: 2),
    ],
    "Maths": [
      Question(
          question: "Combien font 7 x 8 ?",
          options: ["54", "56", "64", "49"],
          correctAnswerIndex: 1),
      Question(
          question: "Quelle est la racine carrée de 144 ?",
          options: ["10", "12", "14", "16"],
          correctAnswerIndex: 1),
    ],
    "Histoire": [
      Question(
          question: "En quelle année a eu lieu la Révolution française ?",
          options: ["1776", "1789", "1815", "1848"],
          correctAnswerIndex: 1),
      Question(
          question: "Qui était le premier président des États-Unis ?",
          options: ["Lincoln", "Washington", "Roosevelt", "Jefferson"],
          correctAnswerIndex: 1),
    ],
    "Science": [
      Question(
          question: "Quel est l’élément chimique représenté par 'O' ?",
          options: ["Or", "Oxygène", "Ozone", "Osmium"],
          correctAnswerIndex: 1),
      Question(
          question: "Quelle planète est la plus proche du Soleil ?",
          options: ["Mars", "Vénus", "Mercure", "Terre"],
          correctAnswerIndex: 2),
    ],
  };

  void setTheme(String theme) {
    questions = List.from(questionsByTheme[theme] ?? []);
    currentQuestionIndex = 0;
    score = 0;
    quizFinished = false;
  }

  Question get currentQuestion => questions[currentQuestionIndex];

  void nextQuestion(int selectedAnswerIndex, int timeRemaining) {
    if (selectedAnswerIndex != -1 &&
        selectedAnswerIndex == currentQuestion.correctAnswerIndex) {
      int points = 10 - (10 - timeRemaining);
      if (points < 1) points = 1;
      score += points;
    }

    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
    } else {
      quizFinished = true;
    }
  }

  void resetQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    quizFinished = false;
  }
}
