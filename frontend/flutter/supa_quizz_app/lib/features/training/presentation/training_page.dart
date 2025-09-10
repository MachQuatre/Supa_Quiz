import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/services/training_service.dart';
import '../models/training_recommendation.dart';
import '../providers/training_provider.dart';

class TrainingPage extends StatefulWidget {
  const TrainingPage({super.key});

  @override
  State<TrainingPage> createState() => _TrainingPageState();
}

class _TrainingPageState extends State<TrainingPage> {
  String? _selectedTheme;
  String? _selectedDifficulty;

  Future<void> _load(TrainingProvider p) async {
    await p.load(limit: 50);
    // Reset filtres si valeurs non présentes
    final themes = p.items.map((e) => e.theme).whereType<String>().toSet();
    final diffs = p.items.map((e) => e.difficulty).whereType<String>().toSet();
    if (_selectedTheme != null && !themes.contains(_selectedTheme)) {
      setState(() => _selectedTheme = null);
    }
    if (_selectedDifficulty != null && !diffs.contains(_selectedDifficulty)) {
      setState(() => _selectedDifficulty = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => TrainingProvider(service: TrainingService()),
      child: Consumer<TrainingProvider>(
        builder: (context, p, _) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('Entrainement'),
            ),
            body: RefreshIndicator(
              onRefresh: () => _load(p),
              child: FutureBuilder(
                future: p.items.isEmpty && !p.loading ? _load(p) : null,
                builder: (context, _) {
                  if (p.loading && p.items.isEmpty) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (p.error != null && p.items.isEmpty) {
                    final isGateway = p.error!.contains('502');
                    return ListView(
                      children: [
                        const SizedBox(height: 60),
                        Icon(
                          isGateway ? Icons.cloud_off : Icons.error_outline,
                          size: 48,
                          color: Colors.purple.shade200,
                        ),
                        const SizedBox(height: 16),
                        Center(
                          child: Text(
                            isGateway
                                ? "L'IA est momentanément indisponible."
                                : "Erreur : ${p.error}",
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Center(
                          child: TextButton.icon(
                            onPressed: () => _load(p),
                            icon: const Icon(Icons.refresh),
                            label: const Text('Réessayer'),
                          ),
                        ),
                      ],
                    );
                  }

                  final themes = p.items
                      .map((e) => e.theme)
                      .whereType<String>()
                      .toSet()
                      .toList()
                    ..sort();
                  final diffs = p.items
                      .map((e) => e.difficulty)
                      .whereType<String>()
                      .toSet()
                      .toList()
                    ..sort();

                  List<TrainingRecommendation> filtered = p.items;
                  if (_selectedTheme != null) {
                    filtered = filtered
                        .where((e) => e.theme == _selectedTheme)
                        .toList();
                  }
                  if (_selectedDifficulty != null) {
                    filtered = filtered
                        .where((e) => e.difficulty == _selectedDifficulty)
                        .toList();
                  }

                  return ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: filtered.length + 1,
                    separatorBuilder: (_, __) => const Divider(height: 24),
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        // Barre de filtres
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                FilterChip(
                                  label: const Text('Tous thèmes'),
                                  selected: _selectedTheme == null,
                                  onSelected: (_) =>
                                      setState(() => _selectedTheme = null),
                                ),
                                ...themes.map(
                                  (t) => FilterChip(
                                    label: Text(t),
                                    selected: _selectedTheme == t,
                                    onSelected: (_) =>
                                        setState(() => _selectedTheme = t),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                FilterChip(
                                  label: const Text('Toutes difficultés'),
                                  selected: _selectedDifficulty == null,
                                  onSelected: (_) => setState(
                                      () => _selectedDifficulty = null),
                                ),
                                ...diffs.map(
                                  (d) => FilterChip(
                                    label: Text(d),
                                    selected: _selectedDifficulty == d,
                                    onSelected: (_) =>
                                        setState(() => _selectedDifficulty = d),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            if (p.error != null)
                              Row(
                                children: [
                                  const Icon(Icons.info_outline, size: 18),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      "Certaines recommandations sont en cache / fallback.\n${p.error}",
                                      style:
                                          Theme.of(context).textTheme.bodySmall,
                                    ),
                                  ),
                                ],
                              ),
                          ],
                        );
                      }

                      final r = filtered[index - 1];
                      return _RecoTile(
                        rec: r,
                        onStart: () {
                          final ids = filtered
                              .map((e) => e.questionId)
                              .whereType<String>()
                              .toList();
                          Navigator.pushNamed(
                            context,
                            '/training/session',
                            arguments: {
                              'questionIds': ids,
                              'startIndex': filtered.indexOf(r),
                            },
                          );
                        },
                      );
                    },
                  );
                },
              ),
            ),
          );
        },
      ),
    );
  }
}

/* ---------- Helpers d’affichage ---------- */

String _reasonLabel(String raw) {
  switch (raw) {
    case 'cold_start':
      return 'cold_start';
    case 'weak_topic':
      return 'sujet faible';
    case 'low_mastery':
      return 'maîtrise faible';
    case 'spaced_review':
      return 'révision espacée';
    case 'recent_miss':
      return 'erreurs récentes';
    default:
      return raw.replaceAll('_', ' ');
  }
}

class _RecoTile extends StatelessWidget {
  final TrainingRecommendation rec;
  final VoidCallback onStart;

  const _RecoTile({required this.rec, required this.onStart});

  @override
  Widget build(BuildContext context) {
    final subtitleParts = <String>[
      if (rec.theme != null) "Thème: ${rec.theme}",
      if (rec.difficulty != null) "Difficulté: ${rec.difficulty}",
      if (rec.reasonType.isNotEmpty) "Raison: ${_reasonLabel(rec.reasonType)}",
      if (rec.scoreRecent != null) "score récent: ${rec.scoreRecent}"
    ];
    final subtitle = subtitleParts.join(" • ");

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
      title: Text("Question #${rec.questionId}"),
      subtitle: Text(subtitle),
      trailing: FilledButton(
        onPressed: onStart,
        child: const Text("S'entraîner"),
      ),
    );
  }
}
