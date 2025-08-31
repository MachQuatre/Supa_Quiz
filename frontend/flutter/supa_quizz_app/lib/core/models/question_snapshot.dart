class QuestionSnapshot {
  final int index; // 0..n-1
  final String text;
  final List<String> options;
  final int? correctIndex; // optionnel

  QuestionSnapshot({
    required this.index,
    required this.text,
    required this.options,
    this.correctIndex,
  });

  factory QuestionSnapshot.fromJson(Map<String, dynamic> j) => QuestionSnapshot(
        index: j['index'] as int,
        text: j['text'] as String,
        options: List<String>.from(j['options'] as List),
        correctIndex:
            j.containsKey('correctIndex') ? j['correctIndex'] as int : null,
      );
}
