import 'question_snapshot.dart';

class QuestionnaireModel {
  final String id;
  final String name;
  final String themeId;
  final List<QuestionSnapshot> questions;

  QuestionnaireModel({
    required this.id,
    required this.name,
    required this.themeId,
    required this.questions,
  });
}
