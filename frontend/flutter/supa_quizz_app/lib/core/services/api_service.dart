import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://localhost:3000/api';

  static Future<dynamic> post(String endpoint, Map<String, dynamic> data,
      {String? token}) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final response = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode(data),
    );
    return _handleResponse(response);
  }

  static Future<dynamic> get(String endpoint, {String? token}) async {
    final uri = Uri.parse('$baseUrl$endpoint');

    final headers = {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };

    print("📤 [GET] $uri");
    print("🛂 Headers envoyés : $headers");

    final response = await http.get(uri, headers: headers);
    return _handleResponse(response);
  }

  static dynamic _handleResponse(http.Response response) {
    if (response.headers['content-type']?.contains('application/json') ==
        true) {
      final decoded = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return decoded;
      } else {
        throw Exception(decoded['message'] ?? 'Erreur API');
      }
    } else {
      throw Exception("Réponse non-JSON : ${response.body}");
    }
  }
}
