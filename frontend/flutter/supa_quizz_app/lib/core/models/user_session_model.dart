import 'question_snapshot.dart';

class UserSessionModel {
  final String id;
  final String questionnaireId;
  final String themeId;
  final List<QuestionSnapshot> questions;

  UserSessionModel({
    required this.id,
    required this.questionnaireId,
    required this.themeId,
    required this.questions,
  });
}
