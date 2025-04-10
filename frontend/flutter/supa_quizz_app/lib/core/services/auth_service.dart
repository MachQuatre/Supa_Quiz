import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const String _baseUrl =
      'http://localhost:3000/api/auth/login'; // adapte si besoin

  /// ➕ Signup
  static Future<Map<String, dynamic>> signup({
    required String username,
    required String email,
    required String password,
    required String role, // ex: "user", "admin", "super_user"
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/auth/signup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'email': email,
        'password': password,
        'role': role,
      }),
    );
    return _handleResponse(response);
  }

  /// 🔐 Login
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    final data = _handleResponse(response);
    if (data['token'] != null) {
      await saveToken(data['token']);
    }
    return data;
  }

  /// 🧠 Profil utilisateur via token
  static Future<Map<String, dynamic>> getProfile() async {
    final token = await getToken();
    if (token == null) throw Exception("Token manquant");

    final response = await http.get(
      Uri.parse('$_baseUrl/auth/me'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return _handleResponse(response);
  }

  /// 💾 Stockage du token
  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  /// 🔓 Récupération du token
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  /// ❌ Déconnexion
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  /// 📡 Centralise la gestion des réponses HTTP
  static dynamic _handleResponse(http.Response response) {
    print('Status: ${response.statusCode}');
    print('Body: ${response.body}'); // 👈 Ajoute ça pour voir la vraie réponse
    final decoded = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    } else {
      throw Exception(decoded['message'] ?? 'Erreur API');
    }
  }
}
