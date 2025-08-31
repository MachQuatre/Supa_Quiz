import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// IMPORTANT : ajuste l'URL si tu es sur un émulateur Android -> 10.0.2.2
const String apiBase = "http://localhost:3000/api";

class AuthService {
  /// Connexion
  static Future<Map<String, dynamic>> login(
      String email, String password) async {
    final uri = Uri.parse("$apiBase/auth/login");
    final res = await http.post(
      uri,
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"email": email, "password": password}),
    );

    final data = _decode(res);

    if (res.statusCode == 200 && data["token"] != null) {
      await _saveSession(
        token: data["token"],
        role: data["role"] ?? "user",
        userId: data["user_id"]?.toString() ?? "",
        username: data["username"]?.toString() ?? "",
        email: email,
        avatar:
            data["avatar_choisi"]?.toString() ?? "assets/avatars/avatar1.png",
        // on passe tel quel (peut être List, String, null) -> encodé proprement plus bas
        achievement: data["achievement_state"],
      );
    }

    return {"ok": res.statusCode == 200, "data": data};
  }

  /// Inscription
  static Future<Map<String, dynamic>> signup({
    required String username,
    required String email,
    required String password,

  }) async {
    final uri = Uri.parse("$apiBase/auth/signup");
    final res = await http.post(
      uri,
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "username": username,
        "email": email,
        "password": password,
        "role": "user"
      }),
    );

    final data = _decode(res);
    return {"ok": res.statusCode == 201 || res.statusCode == 200, "data": data};
  }

  /// Décode la réponse HTTP en JSON
  static Map<String, dynamic> _decode(http.Response r) {
    try {
      final body = (r.body.isEmpty) ? "{}" : r.body;
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) return decoded;
      return {"data": decoded};
    } catch (_) {
      return {"message": r.body};
    }
  }

  /// Sauvegarde session utilisateur
  /// - achievement peut être List / String / null -> on stocke **toujours** une String JSON
  static Future<void> _saveSession({
    required String token,
    required String role,
    required String userId,
    required String username,
    required String email,
    required String avatar,
    required dynamic achievement,
  }) async {
    final sp = await SharedPreferences.getInstance();

    // Normalisation achievement -> List<String>
    final List<String> achList = (achievement is List)
        ? achievement.map((e) => e.toString()).toList().cast<String>()
        : <String>[];

    // Stockage
    await sp.setString("token", token);
    await sp.setString("role", role);
    await sp.setString("user_id", userId);
    await sp.setString("username", username);
    await sp.setString("email", email);
    await sp.setString("avatar_choisi", avatar);

    // important : on stocke comme JSON string pour Web/Prefs
    await sp.setString("achievement_state", jsonEncode(achList));
  }

  /// Déconnexion
  static Future<void> logout() async {
    final sp = await SharedPreferences.getInstance();
    await sp.clear();
  }

  /// Vérifie si l'utilisateur est connecté
  static Future<bool> isLoggedIn() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString("token") != null;
  }

  /// Getters rapides
  static Future<String?> token() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString("token");
  }

  static Future<String?> userId() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString("user_id");
  }

  static Future<String?> role() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString("role");
  }

  static Future<String?> username() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString("username");
  }

  static Future<String?> email() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString("email");
  }

  static Future<String?> avatar() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString("avatar_choisi");
  }

  /// ⚠️ Compat : renvoie la **chaîne JSON** stockée ("[]", "[\"A1\"]", …)
  /// Garde la signature originale pour ne rien casser.
  static Future<String?> achievement() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString("achievement_state");
  }

  /// ✅ Nouveau helper pratique : renvoie **List<String>** décodée
  static Future<List<String>> achievementCodes() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString("achievement_state");
    if (raw == null || raw.isEmpty) return <String>[];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.map((e) => e.toString()).toList();
      }
    } catch (_) {}
    return <String>[];
  }

  /// Récupère toutes les infos en une fois
  /// - on renvoie la List décodée + la chaîne brute pour compat
  static Future<Map<String, dynamic>> getSession() async {
    final sp = await SharedPreferences.getInstance();
    final achRaw = sp.getString("achievement_state") ?? "[]";
    List<String> achList;
    try {
      final d = jsonDecode(achRaw);
      achList = (d is List) ? d.map((e) => e.toString()).toList() : <String>[];
    } catch (_) {
      achList = <String>[];
    }
    return {
      "token": sp.getString("token"),
      "role": sp.getString("role"),
      "user_id": sp.getString("user_id"),
      "username": sp.getString("username"),
      "email": sp.getString("email"),
      "avatar_choisi": sp.getString("avatar_choisi"),
      "achievement_state_raw": achRaw, // String JSON (compat)
      "achievement_state": achList, // List<String> prête à l'emploi
    };
  }
}
