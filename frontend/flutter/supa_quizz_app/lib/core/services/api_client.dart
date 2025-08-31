import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/auth_service.dart'; // ton service existant

class ApiClient {
  static const String baseUrl =
      "http://localhost:3000/api"; // 10.0.2.2 sur émulateur Android
  static Uri _u(String p) => Uri.parse("$baseUrl$p");

  static Future<Map<String, String>> _headers({bool json = true}) async {
    final t = await AuthService.token();
    final h = <String, String>{};
    if (json) h['Content-Type'] = 'application/json';
    if (t != null) h['Authorization'] = 'Bearer $t';
    return h;
  }

  static Future<Map<String, dynamic>> post(
      String path, Map<String, dynamic> body) async {
    final res = await http.post(_u(path),
        headers: await _headers(), body: jsonEncode(body));
    _check(res);
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> get(String path) async {
    final res = await http.get(_u(path), headers: await _headers(json: false));
    _check(res);
    return jsonDecode(res.body);
  }

  static void _check(http.Response r) {
    if (r.statusCode < 200 || r.statusCode >= 300) {
      throw Exception("HTTP ${r.statusCode}: ${r.body}");
    }
  }
}
