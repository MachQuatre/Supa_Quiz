import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'auth_service.dart';

class ApiService {
  // ⚠️ Sur Android émulateur : "http://10.0.2.2:3000/api"
  static const String baseUrl = "http://localhost:3000/api";

  static String? _token;
  // ------------------ helpers ------------------
  static Uri _uri(String path) => Uri.parse("$baseUrl$path");

  static final RegExp _uuidV4 = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    caseSensitive: false,
  );
  static bool _isUuidV4(String? v) => v != null && _uuidV4.hasMatch(v);

  static Future<Map<String, String>> _authHeaders(
      {bool jsonBody = true}) async {
    final token = await AuthService.token();
    final headers = <String, String>{};
    if (jsonBody) headers["Content-Type"] = "application/json";
    if (token != null) headers["Authorization"] = "Bearer $token";
    return headers;
  }

  static void setToken(String? token) {
    _token = token;
  }

  // ------------------ QUIZZES ------------------
  static Future<Map<String, dynamic>?> fetchQuizBySessionCode(
    String gameSessionId,
  ) async {
    try {
      final res =
          await http.get(_uri("/game-sessions/$gameSessionId/questions"));
      if (res.statusCode == 200) return json.decode(res.body);
      // ignore: avoid_print
      print("❌ fetchQuizBySessionCode: ${res.statusCode} - ${res.body}");
      return null;
    } catch (e) {
      // ignore: avoid_print
      print("❌ fetchQuizBySessionCode exception: $e");
      return null;
    }
  }

  // --------------- PROFIL UTILISATEUR ---------------
  static Future<Map<String, dynamic>> getMe() async {
    final headers = await _authHeaders(jsonBody: false);
    final res = await http.get(_uri("/auth/me"), headers: headers);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception("❌ getMe: ${res.statusCode} - ${res.body}");
  }

  /// ✅ Résumé profil (score total cumulé + 10 dernières parties)
  /// Appelle toujours l’API avec ?user_id=<me.user_id> pour éviter tout souci d’auth middleware.
  static Future<Map<String, dynamic>> fetchMySummary() async {
    final headers = await _authHeaders(jsonBody: false);

    // Source de vérité pour l'user_id
    final me = await getMe();
    final userId = me["user_id"];
    if (userId == null) {
      throw Exception("getMe() n'a pas renvoyé user_id");
    }

    final url = _uri("/user-sessions/me/summary?user_id=$userId");
    final res = await http.get(url, headers: headers);

    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception("❌ fetchMySummary: ${res.statusCode} - ${res.body}");
  }

  // (Déprécié par fetchMySummary) — conservé pour compatibilité
  static Future<int?> getTotalScore(String userId) async {
    final headers = await _authHeaders(jsonBody: false);
    final res =
        await http.get(_uri("/users/$userId/score-total"), headers: headers);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data["totalScore"];
    }
    // ignore: avoid_print
    print("❌ getTotalScore: ${res.statusCode} - ${res.body}");
    return null;
  }

  // (Déprécié par fetchMySummary) — conservé pour compatibilité
  static Future<List<Map<String, dynamic>>?> getHistory(String userId) async {
    final headers = await _authHeaders(jsonBody: false);
    final res =
        await http.get(_uri("/users/$userId/history"), headers: headers);
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.cast<Map<String, dynamic>>();
    }
    // ignore: avoid_print
    print("❌ getHistory: ${res.statusCode} - ${res.body}");
    return null;
  }

  static Future<String?> updateAvatar(String userId, String avatar) async {
    final headers = await _authHeaders();
    final res = await http.patch(
      _uri("/users/$userId/avatar"),
      headers: headers,
      body: jsonEncode({"avatar": avatar}),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final sp = await SharedPreferences.getInstance();
      await sp.setString("avatar_choisi", data["avatar_choisi"]);
      return data["avatar_choisi"];
    }
    // ignore: avoid_print
    print("❌ updateAvatar: ${res.statusCode} - ${res.body}");
    return null;
  }

  static Future<Map<String, dynamic>?> joinGameSession(String code) async {
    try {
      final headers = await _authHeaders(); // inclut Content-Type + Bearer

      // Récupère user_id depuis /auth/me (tolérant aux schémas)
      final me = await getMe();
      String? userId = (me["user_id"] ??
              me["id"] ??
              me["_id"] ??
              (me["user"] is Map
                  ? (me["user"]["user_id"] ??
                      me["user"]["id"] ??
                      me["user"]["_id"])
                  : null))
          ?.toString();

      if (userId == null || userId.trim().isEmpty) {
        print("❌ joinGameSession: user_id introuvable dans /auth/me");
        return null;
      }
      userId = userId.trim();

      final url = _uri("/game-sessions/$code/join");
      final body = jsonEncode({"user_id": userId});

      print("➡️ POST $url");
      print(
          "AUTH >>> ${headers.containsKey('Authorization') ? 'Bearer present' : 'NO TOKEN'}");
      print("➡️ BODY: $body");

      final res = await http.post(url, headers: headers, body: body);

      print("⬅️ ${res.statusCode} ${res.body}");
      if (res.statusCode == 200) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      print("❌ joinGameSession exception: $e");
      return null;
    }
  }

  static Future<Map<String, dynamic>> submitSessionSummary(
    String userSessionUuid, // public UUID
    List<Map<String, dynamic>> questionsPlayed,
    int score,
    int completion, // 0..100
  ) async {
    // Garde-fous côté client
    if (userSessionUuid.trim().isEmpty) {
      throw Exception("submitSessionSummary: userSessionUuid manquant");
    }
    if (completion < 0 || completion > 100) {
      throw Exception(
          "submitSessionSummary: completion hors bornes ($completion)");
    }

    final headers = await _authHeaders();
    if (!headers.containsKey("Authorization")) {
      throw Exception("submitSessionSummary: JWT absent (non connecté ?)");
    }

    final url =
        _uri("/user-sessions/${Uri.encodeComponent(userSessionUuid)}/summary");
    final body = jsonEncode({
      "questions_played": questionsPlayed,
      "score": score,
      "completion_percentage": completion,
    });

    // Logs utiles
    // ignore: avoid_print
    print("➡️ POST $url");
    final res = await http.post(url, headers: headers, body: body);
    // ignore: avoid_print
    print("⬅️ ${res.statusCode} ${res.body}");

    // Gestion explicite des erreurs
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data;
    }

    // remonte des messages précis
    switch (res.statusCode) {
      case 400:
        throw Exception("Résumé invalide (400): ${res.body}");
      case 401:
        throw Exception("Non authentifié (401): token manquant/expiré.");
      case 404:
        throw Exception("UserSession introuvable (404).");
      case 409:
        throw Exception("Conflit (409): session déjà clôturée ?");
      default:
        throw Exception("Erreur ${res.statusCode}: ${res.body}");
    }
  }

  static Future<List<String>> fetchLeaderboardThemes() async {
    final headers = await _authHeaders(jsonBody: false);
    final res = await http.get(_uri("/leaderboard/themes"), headers: headers);
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.cast<String>();
    }
    throw Exception("fetchLeaderboardThemes: ${res.statusCode} ${res.body}");
  }

  static Future<List<Map<String, dynamic>>> fetchLeaderboardGlobal(
      {int limit = 10}) async {
    final headers = await _authHeaders(jsonBody: false);
    final res =
        await http.get(_uri("/leaderboard?limit=$limit"), headers: headers);
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.cast<Map<String, dynamic>>();
    }
    throw Exception("fetchLeaderboardGlobal: ${res.statusCode} ${res.body}");
  }

  static Future<List<Map<String, dynamic>>> fetchLeaderboardByTheme(
      String theme,
      {int limit = 10}) async {
    final headers = await _authHeaders(jsonBody: false);
    final res = await http.get(
        _uri("/leaderboard/theme/${Uri.encodeComponent(theme)}?limit=$limit"),
        headers: headers);
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.cast<Map<String, dynamic>>();
    }
    throw Exception("fetchLeaderboardByTheme: ${res.statusCode} ${res.body}");
  }

  static Map<String, String> _jsonHeaders([Map<String, String>? extra]) {
    final h = <String, String>{'Content-Type': 'application/json'};
    if (_token != null && _token!.isNotEmpty) {
      h['Authorization'] = 'Bearer $_token';
    }
    if (extra != null) h.addAll(extra);
    return h;
  }

  /// Compat: certains écrans l’attendaient
  static Future<Map<String, String>> authHeaders({bool jsonBody = true}) async {
    // Utilise désormais AuthService.token() (SharedPreferences)
    return _authHeaders(jsonBody: jsonBody);
  }

  static Uri _resolve(String path) {
    if (path.startsWith('http')) return Uri.parse(path);
    final base = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    final p = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$base$p');
  }

  // --- Méthodes HTTP statiques ---
  static Future<http.Response> get(
    String path, {
    Map<String, String>? headers,
    bool jsonBody = false, // GET sans Content-Type par défaut
  }) async {
    final base = await _authHeaders(jsonBody: jsonBody);
    final merged = {...base, if (headers != null) ...headers};
    return http.get(_resolve(path), headers: merged);
  }

  static Future<http.Response> post(
    String path, {
    Object? body,
    Map<String, String>? headers,
    bool jsonBody = true, // POST en JSON par défaut
  }) async {
    final base = await _authHeaders(jsonBody: jsonBody);
    final merged = {...base, if (headers != null) ...headers};
    return http.post(
      _resolve(path),
      headers: merged,
      body: body is String ? body : jsonEncode(body),
    );
  }

  static Future<http.Response> put(
    String path, {
    Object? body,
    Map<String, String>? headers,
    bool jsonBody = true,
  }) async {
    final base = await _authHeaders(jsonBody: jsonBody);
    final merged = {...base, if (headers != null) ...headers};
    return http.put(
      _resolve(path),
      headers: merged,
      body: body is String ? body : jsonEncode(body),
    );
  }

  static Future<http.Response> delete(
    String path, {
    Object? body,
    Map<String, String>? headers,
    bool jsonBody = true,
  }) async {
    final base = await _authHeaders(jsonBody: jsonBody);
    final merged = {...base, if (headers != null) ...headers};
    return http.delete(
      _resolve(path),
      headers: merged,
      body: body is String ? body : jsonEncode(body),
    );
  }
}
