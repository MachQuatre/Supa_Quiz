import '../models/theme_model.dart';
import 'api_client.dart';

class ApiThemes {
  /// Ancienne route : tous les thèmes (pas filtrés)
  static Future<List<ThemeModel>> getThemes() async {
    final data = await ApiClient.get("/themes");
    final list = (data['themes'] as List?) ?? [];
    return list
        .map<ThemeModel>(
          (j) => ThemeModel.fromJson(
            Map<String, dynamic>.from(j as Map),
          ),
        )
        .toList();
  }

  /// Nouvelle route : thèmes avec ≥ [min] questions
  /// Backend renvoie typiquement: { min, themes: [{ _id, name, count }] }
  static Future<List<ThemeModel>> getAvailableThemes({int min = 5}) async {
    final data = await ApiClient.get("/themes/available?min=$min");
    final list = (data['themes'] as List?) ?? [];
    return list
        .map<ThemeModel>(
          (j) => ThemeModel.fromJson(
            Map<String, dynamic>.from(j as Map),
          ),
        )
        .toList();
  }
}
