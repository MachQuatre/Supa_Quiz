class TrainingRecommendation {
  final String questionId;
  final String reasonType;
  final String? reason; // ⬅️ nouveau
  final String? theme;
  final String? difficulty;
  final num? scoreRecent;

  TrainingRecommendation({
    required this.questionId,
    required this.reasonType,
    this.reason, // ⬅️ nouveau
    this.theme,
    this.difficulty,
    this.scoreRecent,
  });

  factory TrainingRecommendation.fromJson(Map<String, dynamic> j) {
    return TrainingRecommendation(
      questionId: (j['question_id'] ?? j['id'] ?? j['qid']).toString(),
      reasonType: (j['reason_type'] ?? 'weak_topic').toString(),
      reason: j['reason'] as String?, // ⬅️ nouveau
      theme: j['theme'] as String?,
      difficulty: j['difficulty'] as String?,
      scoreRecent: j['score_recent'] is num ? j['score_recent'] as num : null,
    );
  }
}
