import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/services/api_service.dart';
import '../../../core/services/training_service.dart';

class TrainingSessionPage extends StatefulWidget {
  final List<String> questionIds;
  final int startIndex;

  const TrainingSessionPage({
    super.key,
    required this.questionIds,
    this.startIndex = 0,
  });

  @override
  State<TrainingSessionPage> createState() => _TrainingSessionPageState();

  static Route routeFromArgs(Object? args) {
    final map = (args is Map) ? args : const {};
    final ids = (map is Map && map['questionIds'] is List)
        ? List<String>.from(map['questionIds'])
        : <String>[];
    final start =
        (map is Map && map['startIndex'] is int) ? map['startIndex'] as int : 0;
    return MaterialPageRoute(
      builder: (_) => TrainingSessionPage(questionIds: ids, startIndex: start),
    );
  }
}

class _TrainingSessionPageState extends State<TrainingSessionPage> {
  late int _idx;
  late List<String> _ids; // liste mutable locale

  bool _loading = false;
  String? _error;

  Map<String, dynamic>? _q; // question courante
  int? _selected; // index réponse choisie
  bool? _isCorrect;
  String? _correctLabel;

  @override
  void initState() {
    super.initState();
    _ids = List<String>.from(widget.questionIds);
    _idx = widget.startIndex.clamp(0, _ids.isEmpty ? 0 : _ids.length - 1);
    _fetch();
  }

  Future<void> _fetch() async {
    if (!mounted || _ids.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
      _q = null;
      _selected = null;
      _isCorrect = null;
      _correctLabel = null;
    });

    try {
      final id = _ids[_idx];
      final encoded = Uri.encodeComponent(id);
      final res = await ApiService.get('/questions/$encoded');
      if (res.statusCode == 200) {
        final data = _safeJson(res.body);
        setState(() => _q = data);
      } else {
        setState(() => _error = "HTTP ${res.statusCode}");
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Map<String, dynamic> _safeJson(String body) {
    try {
      return jsonDecode(body) as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }

  List<_Ans> _answersOf(Map<String, dynamic> q) {
    final raw = q['answers'] ?? q['answer_options'] ?? q['options'] ?? [];
    final list = (raw is List) ? raw : <dynamic>[];
    return List<_Ans>.generate(list.length, (i) {
      final v = list[i];
      if (v is String) return _Ans(id: v, label: v, index: i);
      if (v is Map) {
        final label = (v['text'] ??
                v['label'] ??
                v['answer'] ??
                v['value'] ??
                "Réponse ${i + 1}")
            .toString();
        final id = (v['id'] ?? v['_id'] ?? v['value'] ?? label).toString();
        return _Ans(id: id, label: label, index: i);
      }
      return _Ans(id: v.toString(), label: v.toString(), index: i);
    });
  }

  bool _isCorrectFor(Map<String, dynamic> q, _Ans a) {
    final cid = q['correct_id'] ??
        q['correct_answer'] ??
        q['correct'] ??
        q['correct_index'] ??
        null;
    if (cid == null) return false;
    if (cid is num) return a.index == cid.toInt();
    return a.id.toString() == cid.toString() ||
        a.label.toString() == cid.toString();
  }

  Future<void> _onTapAnswer(int i) async {
    if (_selected != null) return; // déjà répondu
    final ans = _answersOf(_q ?? {})[i];
    final isOk = _isCorrectFor(_q ?? {}, ans);
    HapticFeedback.selectionClick();
    if (!mounted) return;
    setState(() {
      _selected = i;
      _isCorrect = isOk;
      _correctLabel = _answersOf(_q ?? {})
          .firstWhere(
            (a) => _isCorrectFor(_q ?? {}, a),
            orElse: () => ans,
          )
          .label;
    });
  }

  void _next() {
    if (_idx + 1 < _ids.length) {
      setState(() {
        _idx += 1;
      });
      _fetch();
    } else {
      Navigator.of(context).pop();
    }
  }

  Future<void> _similar() async {
    try {
      final recs = await TrainingService().fetchRecommendations(limit: 5);
      final already = _ids.toSet();
      String? nextId;
      for (final r in recs) {
        final id = r.questionId;
        if (id != null && !already.contains(id)) {
          nextId = id;
          break;
        }
      }
      if (nextId == null) return;
      setState(() {
        _ids.insert(_idx + 1, nextId!);
      });
    } catch (_) {
      // silencieux
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = _ids.length;
    final title = total == 0
        ? "Série d’entrainement"
        : "Série d’entrainement (${_idx + 1}/$total)";

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      floatingActionButton: (_selected != null)
          ? FloatingActionButton.extended(
              onPressed: _next,
              icon: const Icon(Icons.arrow_forward),
              label: const Text('Suivant'),
            )
          : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : (_error != null)
              ? Center(child: Text('Erreur: $_error'))
              : (_q == null)
                  ? const Center(child: Text('Question introuvable'))
                  : _QuestionCard(
                      q: _q!,
                      answers: _answersOf(_q!),
                      selected: _selected,
                      isCorrect: _isCorrect,
                      onTap: _onTapAnswer,
                      bottomBar: (_selected != null)
                          ? _ResultBar(
                              isCorrect: _isCorrect ?? false,
                              correctLabel: _correctLabel,
                              onSimilar: _similar,
                            )
                          : null,
                    ),
    );
  }
}

class _QuestionCard extends StatelessWidget {
  final Map<String, dynamic> q;
  final List<_Ans> answers;
  final int? selected;
  final bool? isCorrect;
  final void Function(int index) onTap;
  final Widget? bottomBar;

  const _QuestionCard({
    required this.q,
    required this.answers,
    required this.selected,
    required this.isCorrect,
    required this.onTap,
    this.bottomBar,
  });

  @override
  Widget build(BuildContext context) {
    final text = (q['text'] ??
            q['question_text'] ??
            "${q['theme'] ?? 'Thème'} - ${q['difficulty'] ?? '???'} - ${q['name'] ?? ''}")
        .toString();

    return Stack(
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Card(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18)),
              margin: const EdgeInsets.all(16),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        text,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...List.generate(answers.length, (i) {
                      final a = answers[i];
                      final isChosen = selected == i;
                      final correct = _isCorrectStatic(q, a);
                      final showEval = selected != null;

                      Color? bg;
                      if (showEval && isChosen) {
                        bg = (correct ? Colors.green : Colors.red)
                            .withOpacity(0.20);
                      }

                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        margin: const EdgeInsets.symmetric(vertical: 8),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: selected == null ? () => onTap(i) : null,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 18, vertical: 14),
                            decoration: BoxDecoration(
                              color: bg ??
                                  Theme.of(context)
                                      .colorScheme
                                      .surfaceVariant
                                      .withOpacity(0.08),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: (showEval && isChosen)
                                    ? (correct ? Colors.green : Colors.red)
                                    : Colors.transparent,
                              ),
                            ),
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: Text(a.label),
                            ),
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (bottomBar != null)
          Align(
            alignment: Alignment.bottomCenter,
            child: bottomBar!,
          ),
      ],
    );
  }

  bool _isCorrectStatic(Map<String, dynamic> q, _Ans a) {
    final cid = q['correct_id'] ??
        q['correct_answer'] ??
        q['correct'] ??
        q['correct_index'] ??
        null;
    if (cid == null) return false;
    if (cid is num) return a.index == cid.toInt();
    return a.id.toString() == cid.toString() ||
        a.label.toString() == cid.toString();
  }
}

class _ResultBar extends StatelessWidget {
  final bool isCorrect;
  final String? correctLabel;
  final VoidCallback onSimilar;

  const _ResultBar({
    required this.isCorrect,
    required this.correctLabel,
    required this.onSimilar,
  });

  @override
  Widget build(BuildContext context) {
    final color = isCorrect ? Colors.green : Colors.red;
    final txt = isCorrect ? "Correct" : "Incorrect";
    return Material(
      elevation: 12,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        color: color.withOpacity(0.08),
        child: Row(
          children: [
            Icon(isCorrect ? Icons.check_circle : Icons.cancel, color: color),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                correctLabel != null ? "$txt • Réponse : $correctLabel" : txt,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ),
            TextButton.icon(
              onPressed: onSimilar,
              icon: const Icon(Icons.auto_awesome),
              label: const Text('Similaire'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Ans {
  final String id;
  final String label;
  final int index;
  _Ans({required this.id, required this.label, required this.index});
}
