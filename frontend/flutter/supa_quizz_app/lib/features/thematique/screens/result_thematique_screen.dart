import 'package:flutter/material.dart';

class ResultThematiqueScreen extends StatelessWidget {
  final Map<String, dynamic> result;
  const ResultThematiqueScreen({super.key, required this.result});

  String _badgeFor(int streak) {
    if (streak >= 4) return "assets/sprites/SSJ4.png";
    switch (streak) {
      case 1:
        return "assets/sprites/SSJ1.png";
      case 2:
        return "assets/sprites/SSJ2.png";
      case 3:
        return "assets/sprites/SSJ3.png";
      default:
        return "assets/sprites/SSJ0.png";
    }
  }

  String _commentatorFor(int streak) {
    if (streak >= 4) return "assets/sprites/SSJ4Perso.png";
    switch (streak) {
      case 1:
        return "assets/sprites/SSJ1Perso.png";
      case 2:
        return "assets/sprites/SSJ2Perso.png";
      case 3:
        return "assets/sprites/SSJ3Perso.png";
      default:
        return "assets/sprites/SSJ0Perso.png";
    }
  }

  @override
  Widget build(BuildContext context) {
    // ✅ mappe correctement les clés renvoyées par le back
    final int score = (result['session_score'] ?? result['score'] ?? 0) as int;

    final int totalUser =
        (result['score_total'] ?? result['total_score'] ?? 0) as int;

    final int durationSec = (((result['elapsed_ms'] ??
                result['elapsedMs'] ??
                result['durationSec'] ??
                0) as num) /
            1000)
        .round();

    final int streakMax = (result['streak_max'] ??
        result['streakMax'] ??
        result['bestStreak'] ??
        0) as int;

    final List unlocked = (result['unlocked'] as List?) ?? const [];

    return Scaffold(
      appBar: AppBar(title: const Text('Résultat')),
      body: Stack(
        children: [
          Positioned(
            top: 16,
            left: 16,
            child: CircleAvatar(
              radius: 30,
              backgroundColor: Colors.transparent,
              backgroundImage: AssetImage(_badgeFor(streakMax)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Score de la session',
                                  style: TextStyle(
                                      fontSize: 14, color: Colors.grey)),
                              const SizedBox(height: 4),
                              Text('$score pts',
                                  style: const TextStyle(
                                      fontSize: 36,
                                      fontWeight: FontWeight.bold)),
                              const SizedBox(height: 12),
                              Row(children: [
                                const Icon(Icons.timer_outlined, size: 18),
                                const SizedBox(width: 6),
                                Text('Durée : ${durationSec}s'),
                              ]),
                              const SizedBox(height: 6),
                              Row(children: [
                                const Icon(Icons.star_border, size: 18),
                                const SizedBox(width: 6),
                                Text('Streak max : $streakMax'),
                              ]),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('Total utilisateur',
                                style: TextStyle(
                                    fontSize: 14, color: Colors.grey)),
                            const SizedBox(height: 4),
                            Text('$totalUser',
                                style: const TextStyle(
                                    fontSize: 22, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Petit ruban si un succès vient d’être débloqué
                if (unlocked.isNotEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.emoji_events_outlined),
                        const SizedBox(width: 8),
                        Expanded(
                            child: Text(
                                "Nouveau palier débloqué : ${unlocked.join(', ')}")),
                      ],
                    ),
                  ),

                const SizedBox(height: 16),

                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Image.asset(_commentatorFor(streakMax),
                        width: 220, height: 220),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(score > 0 ? '✅ Beau tir !' : '❌ Ça arrive !',
                                style: TextStyle(
                                  fontSize: 18,
                                  color: score > 0 ? Colors.green : Colors.red,
                                  fontWeight: FontWeight.w600,
                                )),
                            const SizedBox(height: 6),
                            Text(
                              score > 0
                                  ? "Continue comme ça, tu montes au classement."
                                  : "Retente un thème pour chauffer la machine 💪",
                              style: const TextStyle(fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),

                const Spacer(),
                Row(children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: () =>
                          Navigator.of(context).popUntil((r) => r.isFirst),
                      child: const Text('Retour à l’accueil'),
                    ),
                  ),
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
