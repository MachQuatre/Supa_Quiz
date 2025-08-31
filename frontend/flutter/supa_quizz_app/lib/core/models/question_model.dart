class QuestionModel {
  final String id;
  final String text;
  final List<String> options;
  final String correctAnswer; // 'A', 'B', 'C', 'D'
  final String difficulty;
  final String theme;

  QuestionModel({
    required this.id,
    required this.text,
    required this.options,
    required this.correctAnswer,
    required this.difficulty,
    required this.theme,
  });

  factory QuestionModel.fromJson(Map<String, dynamic> json) {
    return QuestionModel(
      id: json['question_id'],
      text: json['question_text'],
      options: List<String>.from(json['answer_options']),
      correctAnswer: json['correct_answer'],
      difficulty: json['difficulty'],
      theme: json['theme'],
    );
  }
}

// 👇 Helpers en dehors de la classe
int letterToIndex(String letter) {
  switch (letter.toUpperCase()) {
    case 'A':
      return 0;
    case 'B':
      return 1;
    case 'C':
      return 2;
    case 'D':
      return 3;
    default:
      return -1;
  }
}

String indexToLetter(int index) {
  const letters = ['A', 'B', 'C', 'D'];
  return (index >= 0 && index < letters.length) ? letters[index] : '?';
}
