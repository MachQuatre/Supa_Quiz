import 'package:flutter/foundation.dart';

/// Contrôleur d’état du quiz thématique.
/// - Gère la sélection, le score, les strikes, les séries (streak),
///   et le gel du timer pendant le feedback.
/// - Indépendant de l’UI pour rester testable.
class ThematiqueController extends ChangeNotifier {
  // ---- Config ----
  /// Durée par question (en secondes) – l’UI du Timer l’utilise.
  final int perQuestionSeconds;

  /// Nombre total de questions de la session (généralement 5).
  final int totalQuestions;

  /// Points gagnés par bonne réponse (par défaut 1).
  final int pointsPerGood;

  /// Malus éventuel par strike (par défaut 0 = pas de malus score).
  final int pointsPerStrike;

  // ---- État runtime ----
  int current = 0; // index de la question en cours
  int score = 0; // score de la session
  int strikes = 0; // mauvaises réponses / délais écoulés
  int bestStreak = 0; // meilleure série de bonnes réponses
  int currentStreak = 0; // série courante
  bool showFeedback = false; // affiche les couleurs de feedback
  bool freezeTimer = false; // gèle le timer pendant le feedback

  /// Réponse utilisateur par question (index d’option 0..3, ou null tant que non répondu)
  final List<int?> answers;

  ThematiqueController({
    required this.totalQuestions,
    this.perQuestionSeconds = 20,
    this.pointsPerGood = 1,
    this.pointsPerStrike = 0,
  }) : answers = List<int?>.filled(totalQuestions, null);

  /// Sélectionne une option pour la question courante et calcule les effets.
  /// [optionIndex] peut valoir -1 pour indiquer "aucune réponse" (timeout).
  /// [correctIndex] peut être null si on ne souhaite pas de feedback instantané.
  void select(int optionIndex, {required int? correctIndex}) {
    if (_isAnswered(current)) return;

    answers[current] = optionIndex;
    freezeTimer = true;
    showFeedback = true;

    final good = (correctIndex != null) && optionIndex == correctIndex;

    if (good) {
      score += pointsPerGood;
      currentStreak += 1;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      strikes += 1;
      currentStreak = 0;
      if (pointsPerStrike > 0) {
        score = (score - pointsPerStrike).clamp(0, 1 << 31);
      }
    }
    notifyListeners();
  }

  /// À appeler lorsque le timer arrive à zéro pour la question courante.
  /// Compte comme un strike si aucune réponse n’a été donnée.
  void timeUp({required int? correctIndex}) {
    if (!_isAnswered(current)) {
      select(-1, correctIndex: correctIndex);
    }
  }

  /// Passe à la question suivante (réinitialise l’affichage de feedback).
  void nextQuestion() {
    showFeedback = false;
    freezeTimer = false;
    if (!isLast) {
      current += 1;
    }
    notifyListeners();
  }

  /// Remet l’état de l’écran en mode “prêt à répondre” pour la question actuelle
  /// (utile si tu affiches un feedback custom puis un bouton “continuer”).
  void clearFeedback() {
    showFeedback = false;
    freezeTimer = false;
    notifyListeners();
  }

  bool get isLast => current >= totalQuestions - 1;

  /// Progression 0.0 → 1.0 (utilisable pour une barre de progression).
  double get progress =>
      totalQuestions == 0 ? 0 : (current + 1) / totalQuestions;

  bool _isAnswered(int index) => answers[index] != null;

  /// Reset complet (au cas où tu veux rejouer immédiatement avec le même set de questions).
  void reset() {
    current = 0;
    score = 0;
    strikes = 0;
    bestStreak = 0;
    currentStreak = 0;
    showFeedback = false;
    freezeTimer = false;
    for (var i = 0; i < answers.length; i++) {
      answers[i] = null;
    }
    notifyListeners();
  }
}
