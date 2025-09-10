// lib/features/training/models/training_recommendation.dart
class TrainingRecommendation {
  final String questionId;
  final String reasonType;
  final String? theme;
  final String? difficulty;
  final num? scoreRecent;

  TrainingRecommendation({
    required this.questionId,
    required this.reasonType,
    this.theme,
    this.difficulty,
    this.scoreRecent,
  });

  factory TrainingRecommendation.fromJson(Map<String, dynamic> j) {
    return TrainingRecommendation(
      questionId: (j['question_id'] ?? j['id'] ?? j['qid']).toString(),
      reasonType: (j['reason_type'] ?? 'weak_topic').toString(),
      theme: j['theme'] as String?,
      difficulty: j['difficulty'] as String?,
      scoreRecent: j['score_recent'] is num ? j['score_recent'] as num : null,
    );
  }
}
