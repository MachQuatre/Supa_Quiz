import 'dart:convert';
import 'package:http/http.dart' as http;

import 'auth_service.dart';
import 'api_service.dart'; // ← source de vérité pour la base URL

class ApiClient {
  // Utilise la même base que partout, gérée par ApiService :
  // - Web prod : "/api" (même origine via Nginx)
  // - Dev natif : "http://10.0.2.2:3000/api"
  static String get _base => ApiService.baseUrl;

  // Concatène proprement la base et le chemin
  static Uri _u(String p) {
    final base =
        _base.endsWith('/') ? _base.substring(0, _base.length - 1) : _base;
    final path = p.startsWith('/') ? p : '/$p';
    return Uri.parse('$base$path');
  }

  static Future<Map<String, String>> _headers({bool json = true}) async {
    final t = await AuthService.token();
    final h = <String, String>{};
    if (json) h['Content-Type'] = 'application/json';
    if (t != null) h['Authorization'] = 'Bearer $t';
    return h;
  }

  // --- HTTP helpers ---

  static Future<Map<String, dynamic>> post(
      String path, Map<String, dynamic> body,
      {Map<String, String>? extraHeaders}) async {
    final res = await http.post(
      _u(path),
      headers: {...await _headers(), if (extraHeaders != null) ...extraHeaders},
      body: jsonEncode(body),
    );
    _check(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> get(String path,
      {Map<String, String>? extraHeaders}) async {
    final res = await http.get(
      _u(path),
      headers: {
        ...await _headers(json: false),
        if (extraHeaders != null) ...extraHeaders
      },
    );
    _check(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> put(
      String path, Map<String, dynamic> body,
      {Map<String, String>? extraHeaders}) async {
    final res = await http.put(
      _u(path),
      headers: {...await _headers(), if (extraHeaders != null) ...extraHeaders},
      body: jsonEncode(body),
    );
    _check(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> delete(String path,
      {Map<String, dynamic>? body, Map<String, String>? extraHeaders}) async {
    final res = await http.delete(
      _u(path),
      headers: {...await _headers(), if (extraHeaders != null) ...extraHeaders},
      body: body == null ? null : jsonEncode(body),
    );
    _check(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  static void _check(http.Response r) {
    if (r.statusCode < 200 || r.statusCode >= 300) {
      throw Exception("HTTP ${r.statusCode}: ${r.body}");
    }
  }
}
