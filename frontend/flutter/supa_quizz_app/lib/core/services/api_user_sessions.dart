import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/api_service.dart';
import '../services/http_with_auth.dart';
import '../models/question_snapshot.dart';
import '../models/user_session_model.dart';

Uri _u(String p) => Uri.parse("${ApiService.baseUrl}$p");

class ApiUserSessions {
  /// POST /thematic-sessions { questionnaireId }
  static Future<UserSessionModel> create(String questionnaireId) async {
    final uri = _u("/thematic-sessions");
    final res = await HttpAuth.post(
      uri,
      body: jsonEncode({"questionnaireId": questionnaireId}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception("HTTP ${res.statusCode}: ${res.body}");
    }

    final data = jsonDecode(res.body);
    final qs = (data['questions'] as List)
        .map((j) => QuestionSnapshot.fromJson(j))
        .toList();

    return UserSessionModel(
      id: data['userSessionId'] as String,
      questionnaireId: questionnaireId,
      themeId: (data['themeId'] ?? "") as String,
      questions: qs,
    );
  }

  static Future<Map<String, dynamic>> endSession({
    required String sessionId,
    required int scoreTotal, // score de CETTE session
    List<int>? answers,
    int? elapsedMs,
    int? strikes,
    int? streakMax,
    String? userId, // seulement si le back en a besoin
  }) async {
    final uri = _u("/user-sessions/$sessionId/end");
    final body = {
      "score_total": scoreTotal,
      if (answers != null) "answers": answers,
      if (elapsedMs != null) "elapsedMs": elapsedMs,
      if (strikes != null) "strikes": strikes,
      if (streakMax != null) "streakMax": streakMax,
      if (userId != null) "user_id": userId,
    };
    final res = await HttpAuth.post(uri, body: jsonEncode(body));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception("HTTP ${res.statusCode}: ${res.body}");
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
