import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/api_service.dart'; // pour baseUrl
import '../services/http_with_auth.dart'; // pour HttpAuth.get/post
import '../models/question_snapshot.dart';
import '../models/questionnaire_model.dart';

Uri _u(String p) => Uri.parse("${ApiService.baseUrl}$p");

class ApiQuestionnaires {
  /// Crée un questionnaire (5 questions aléatoires) pour un thème
  /// POST /questionnaires { themeId }
  static Future<QuestionnaireModel> create(String themeId) async {
    final uri = _u("/questionnaires");
    final res = await HttpAuth.post(
      uri,
      body: jsonEncode({"themeId": themeId}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception("HTTP ${res.statusCode}: ${res.body}");
    }

    final data = jsonDecode(res.body);
    final qs = (data['questions'] as List)
        .map((j) => QuestionSnapshot.fromJson(j))
        .toList();

    return QuestionnaireModel(
      id: data['questionnaireId'] as String,
      name: data['name'] as String,
      themeId: (data['theme'] ?? themeId) as String,
      questions: qs,
    );
  }
}
