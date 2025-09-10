// lib/features/training/providers/training_provider.dart
import 'package:flutter/foundation.dart';

// ⛳️ Remplace les imports package: par des imports relatifs
import '../../../core/services/training_service.dart';
import '../models/training_recommendation.dart';

class TrainingProvider extends ChangeNotifier {
  final TrainingService service;

  TrainingProvider({required this.service});

  bool _loading = false;
  String? _error;
  List<TrainingRecommendation> _items = [];

  bool get loading => _loading;
  String? get error => _error;
  List<TrainingRecommendation> get items => _items;

  Future<void> load({int limit = 20}) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _items = await service.fetchRecommendations(limit: limit);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
