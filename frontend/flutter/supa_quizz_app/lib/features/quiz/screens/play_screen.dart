import 'package:flutter/material.dart';
import '../../../core/services/api_service.dart';
import '../../../features/quiz/screens/quiz_screen.dart';
import '../../../features/thematique/screens/theme_selector_screen.dart'; // ✅ ajout

class PlayScreen extends StatelessWidget {
  const PlayScreen({super.key});

  void _showCodeDialog(BuildContext context) {
    final controller = TextEditingController();
    bool loading = false;
    String? errorMsg;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) {
          Future<void> validate() async {
            final code = controller.text.trim();
            if (code.isEmpty) {
              setState(() => errorMsg = "Entre un code de session.");
              return;
            }

            setState(() {
              loading = true;
              errorMsg = null;
            });

            try {
              // 1) Join game session (via code)
              final joinRes = await ApiService.joinGameSession(code);
              if (joinRes == null) {
                setState(() {
                  loading = false;
                  errorMsg = "Impossible de rejoindre la session.";
                });
                return;
              }

              final Map<String, dynamic>? us =
                  (joinRes['userSession'] as Map?)?.cast<String, dynamic>();
              final Map<String, dynamic>? gs =
                  (joinRes['session'] as Map?)?.cast<String, dynamic>();

              final String? userSessionUuid =
                  us?['user_session_id']?.toString();

              final String? gameSessionId =
                  us?['game_session_id']?.toString() ??
                      gs?['session_id']?.toString() ??
                      gs?['_id']?.toString();

              if (userSessionUuid == null || gameSessionId == null) {
                setState(() {
                  loading = false;
                  errorMsg = "Réponse JOIN invalide (ids manquants).";
                });
                return;
              }

              // 2) Charger les questions de la session
              final data =
                  await ApiService.fetchQuizBySessionCode(gameSessionId);
              if (data == null ||
                  data['questions'] == null ||
                  (data['questions'] as List).isEmpty) {
                setState(() {
                  loading = false;
                  errorMsg = "Quiz introuvable pour cette session.";
                });
                return;
              }

              if (context.mounted) {
                Navigator.pop(context); // ferme le dialog
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => QuizScreen(
                      quizData: {
                        'title': data['title'] ?? 'Quiz',
                        'questions': data['questions'],
                        'user_session_uuid': userSessionUuid,
                      },
                    ),
                  ),
                );
              }
            } catch (e) {
              setState(() => errorMsg = "Erreur : $e");
            } finally {
              if (context.mounted) setState(() => loading = false);
            }
          }

          return AlertDialog(
            title: const Text("Quiz Privé"),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: controller,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) {
                    if (!loading) validate();
                  },
                  decoration: const InputDecoration(
                    labelText: "Code session",
                    hintText: "Ex: ABC123",
                  ),
                ),
                if (errorMsg != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Text(
                      errorMsg!,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text("Annuler"),
              ),
              ElevatedButton(
                onPressed: loading ? null : validate,
                child: loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text("Valider"),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          ElevatedButton.icon(
            onPressed: () => _showCodeDialog(context),
            icon: const Icon(Icons.lock),
            label: const Text("🎫 Quiz Privé"),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () {
              // ✅ Navigation directe vers la sélection de thème
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const ThemeSelectorScreen(),
                ),
              );
              // 👉 Variante via route nommée (si déclarée) :
              // Navigator.of(context).pushNamed('/thematique');
            },
            icon: const Icon(Icons.category),
            label: const Text("🎯 Quiz Thématique"),
          ),
        ],
      ),
    );
  }
}
