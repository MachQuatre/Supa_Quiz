// lib/core/services/training_service.dart
import 'dart:convert';
import 'api_service.dart';
import '../../features/training/models/training_recommendation.dart';

class TrainingService {
  Future<List<TrainingRecommendation>> fetchRecommendations(
      {int limit = 20}) async {
    // 1) Récupérer mon user_id depuis /auth/me
    final me = await ApiService.getMe();
    final userId = (me['user_id'] ??
            me['id'] ??
            me['_id'] ??
            (me['user'] is Map
                ? (me['user']['user_id'] ??
                    me['user']['id'] ??
                    me['user']['_id'])
                : null))
        ?.toString();

    if (userId == null || userId.isEmpty) {
      throw Exception('Impossible de déterminer user_id depuis /auth/me');
    }

    // 2) Appeler les reco en passant user_id en query
    final res = await ApiService.get(
        '/training/recommendations?limit=$limit&user_id=$userId');
    if (res.statusCode != 200) {
      throw Exception('HTTP ${res.statusCode}: ${res.body}');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (data['success'] != true || data['items'] is! List) {
      throw Exception('Bad payload');
    }

    return (data['items'] as List)
        .map((e) => TrainingRecommendation.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
