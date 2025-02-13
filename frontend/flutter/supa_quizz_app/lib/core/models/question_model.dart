class Question {
  final String question;
  final List<String> options;
  final int correctAnswerIndex;

  Question({
    required this.question,
    required this.options,
    required this.correctAnswerIndex,
  });
}

// Mock data pour le PoC
final List<Question> questionsMock = [
  Question(
    question: "Quel est le plus grand océan du monde ?",
    options: ["Atlantique", "Pacifique", "Indien", "Arctique"],
    correctAnswerIndex: 1,
  ),
  Question(
    question: "Quelle est la capitale du Japon ?",
    options: ["Pékin", "Séoul", "Tokyo", "Bangkok"],
    correctAnswerIndex: 2,
  ),
];
