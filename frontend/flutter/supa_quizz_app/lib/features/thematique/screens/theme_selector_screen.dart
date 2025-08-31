import 'package:flutter/material.dart';
import '../../../core/models/theme_model.dart';
import '../../../core/services/api_themes.dart';
import '../../thematique/widgets/wheel_spinner.dart';
import '../../../core/services/api_questionnaires.dart';
import '../../../core/services/api_user_sessions.dart';
import '../../../core/models/user_session_model.dart';
import 'quiz_thematique_screen.dart';

class ThemeSelectorScreen extends StatefulWidget {
  const ThemeSelectorScreen({super.key});

  @override
  State<ThemeSelectorScreen> createState() => _ThemeSelectorScreenState();
}

class _ThemeSelectorScreenState extends State<ThemeSelectorScreen> {
  late Future<List<ThemeModel>> _future;
  static const int _minQuestions = 5;

  @override
  void initState() {
    super.initState();
    _future = _loadThemes();
  }

  Future<List<ThemeModel>> _loadThemes() async {
    try {
      // 1) On tente la route filtrée (≥ _minQuestions)
      final filtered = await ApiThemes.getAvailableThemes(min: _minQuestions);
      if (filtered.isNotEmpty) return filtered;
      // 2) Fallback si la liste est vide
      return await ApiThemes.getThemes();
    } catch (_) {
      // 3) Fallback en cas d’erreur réseau/route non dispo
      return await ApiThemes.getThemes();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quizz thématique')),
      body: FutureBuilder<List<ThemeModel>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child:
                    Text('Erreur: ${snap.error}', textAlign: TextAlign.center),
              ),
            );
          }
          final themes = snap.data ?? [];
          if (themes.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Aucun thème disponible (minimum $_minQuestions questions par thème).',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          return Padding(
            padding: const EdgeInsets.all(16),
            child: WheelSpinner(
              themes: themes,
              onConfirm: (theme) async {
                try {
                  // 1) Créer le questionnaire (5 questions tirées du thème)
                  final qz = await ApiQuestionnaires.create(theme.id);

                  // 2) Créer la user session pour ce questionnaire
                  final UserSessionModel session =
                      await ApiUserSessions.create(qz.id);

                  if (!mounted) return;

                  // 3) Naviguer vers l’écran de quiz thématique
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => QuizThematiqueScreen(
                        session: session,
                        questionnaireName: qz.name,
                      ),
                    ),
                  );
                } catch (e) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Impossible de démarrer: $e')),
                  );
                }
              },
            ),
          );
        },
      ),
    );
  }
}
