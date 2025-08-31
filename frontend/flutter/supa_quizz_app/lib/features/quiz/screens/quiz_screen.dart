import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/models/question_model.dart';
import '../../../core/widgets/timer_widget.dart';
import '../../../core/services/api_service.dart';

class QuizScreen extends StatefulWidget {
  final Map<String, dynamic> quizData;
  const QuizScreen({super.key, required this.quizData});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  late final List<QuestionModel> _questions;
  late final List<Map<String, dynamic>> _rawQuestions;

  // ✅ on veut ABSOLUMENT le UUID public ici (plus l'_id mongo)
  late final String _userSessionUuid;

  // progression
  int _currentIndex = 0;
  int _scoreTotal = 0;
  int _pointsForCurrent = 0;
  int _strike = 0;
  bool _quizFinished = false;

  // UI state
  bool _showFeedback = false;
  bool _freezeTimer = false;
  int? _selectedIndex;
  int? _correctIndex;
  Timer? _feedbackTimer;
  late DateTime _startTime;

  // journal pour l'envoi final
  final List<Map<String, dynamic>> _played = [];

  @override
  void initState() {
    super.initState();

    final raw = (widget.quizData['questions'] as List);
    _rawQuestions =
        raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    _questions = raw.map((q) => QuestionModel.fromJson(q)).toList();

    // ✅ récupérer le VRAI UUID public de la user session
    // on NE remplace plus par un _id mongo
    final uuidAny = widget.quizData['user_session_uuid'] ??
        widget.quizData['user_session_id'] ??
        widget.quizData['userSessionUuid'];
    _userSessionUuid = uuidAny?.toString() ?? '';
    if (_userSessionUuid.isEmpty) {
      print("❌ QuizScreen: user_session_uuid manquant");
    }

    _startTime = DateTime.now();
  }

  @override
  void dispose() {
    _feedbackTimer?.cancel();
    super.dispose();
  }

  // ---- helpers (sprites/strike conservés) ----
  String _strikeBadge() {
    if (_strike >= 4) return "assets/sprites/SSJ4.png";
    switch (_strike) {
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

  String _commentator() {
    if (_strike >= 4) return "assets/sprites/SSJ4Perso.png";
    switch (_strike) {
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

  String _qIdAt(int index) {
    final m = _rawQuestions[index];
    final dynamic v = m['id'] ?? m['_id'] ?? m['question_id'];
    return v?.toString() ?? '';
  }

  // ---- mécanique du quiz (calcul des points conservé) ----
  void _showAnswer(int? selectedIndex) {
    final q = _questions[_currentIndex];
    final correct = letterToIndex(q.correctAnswer);

    final elapsedMs = DateTime.now().difference(_startTime).inMilliseconds;
    final isCorrect = (selectedIndex == correct);
    final earnedPoints =
        isCorrect ? (100 - (elapsedMs ~/ 100)).clamp(0, 100) : 0;

    setState(() {
      _selectedIndex = selectedIndex;
      _correctIndex = correct;
      _pointsForCurrent = earnedPoints;
      _scoreTotal += earnedPoints;
      _showFeedback = true;
      _freezeTimer = true;
      _strike = isCorrect ? _strike + 1 : 0;
    });

    // on stocke pour le récap
    _played.add({
      "question_id": _qIdAt(_currentIndex),
      "answered": selectedIndex != null,
      "is_correct": isCorrect,
      "response_time_ms": elapsedMs,
    });

    _feedbackTimer?.cancel();
    _feedbackTimer = Timer(const Duration(seconds: 3), _goToNextQuestion);
  }

  void _goToNextQuestion() {
    if (_currentIndex + 1 < _questions.length) {
      setState(() {
        _currentIndex++;
        _selectedIndex = null;
        _correctIndex = null;
        _pointsForCurrent = 0;
        _showFeedback = false;
        _freezeTimer = false;
        _startTime = DateTime.now();
      });
    } else {
      setState(() => _quizFinished = true);
    }
  }

  Future<void> _finishQuiz() async {
    // ✅ Envoi unique à la fin avec le UUID public (plus d'_id mongo)
    if (_userSessionUuid.isNotEmpty) {
      final completion = ((_played.length / _questions.length) * 100).round();
      try {
        final resp = await ApiService.submitSessionSummary(
          _userSessionUuid, // ✅ UUID public
          _played,
          _scoreTotal,
          completion,
        );
        // Optionnel: récupérer le total cumulé pour l’UI immédiate
        final newTotal = resp?["user_total_score"];
        if (newTotal != null) {
          // ex: context.read<ProfileCubit>().setTotalScore(newTotal);
        }
      } catch (e) {
        // ignore: avoid_print
        print("❌ submitSessionSummary error: $e");
      }
    }
    if (mounted) Navigator.pop(context);
  }

  // ---- UI ----
  @override
  Widget build(BuildContext context) {
    if (_quizFinished) {
      return Scaffold(
        appBar: AppBar(title: const Text("Résultat")),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text("Score total : $_scoreTotal pts",
                  style: const TextStyle(fontSize: 24)),
              Text("Questions jouées : ${_questions.length}",
                  style: const TextStyle(fontSize: 18)),
              const SizedBox(height: 20),
              ElevatedButton(
                  onPressed: _finishQuiz, child: const Text("Terminer")),
            ],
          ),
        ),
      );
    }

    final question = _questions[_currentIndex];

    return Scaffold(
      appBar: AppBar(
          title: Text("Question ${_currentIndex + 1} / ${_questions.length}")),
      body: Stack(
        children: [
          Positioned(
            top: 16,
            left: 16,
            child: CircleAvatar(
              radius: 30,
              backgroundColor: Colors.transparent,
              backgroundImage: AssetImage(_strikeBadge()),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Text(
                  question.text,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                TimerWidget(
                  duration: 10,
                  keyTrigger: _currentIndex,
                  onTimeUp: () => _showAnswer(null),
                  freeze: _freezeTimer,
                ),
                const SizedBox(height: 16),
                for (int i = 0; i < question.options.length; i++)
                  _answerButton(i, question.options[i]),
                const SizedBox(height: 16),
                if (_showFeedback)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Image.asset(_commentator(), width: 320, height: 320),
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
                              Text(
                                (_selectedIndex == _correctIndex)
                                    ? "✅ Bien joué !"
                                    : "❌ Dommage !",
                                style: TextStyle(
                                  fontSize: 18,
                                  color: (_selectedIndex == _correctIndex)
                                      ? Colors.green
                                      : Colors.red,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text("Points gagnés : $_pointsForCurrent",
                                  style: const TextStyle(fontSize: 16)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _answerButton(int index, String text) {
    Color? bg;
    if (_showFeedback) {
      if (_correctIndex == index) {
        bg = Colors.green;
      } else if (_selectedIndex == index && _selectedIndex != _correctIndex) {
        bg = Colors.red;
      } else {
        bg = Colors.grey.shade800;
      }
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: ElevatedButton(
        onPressed: (_showFeedback || _selectedIndex != null)
            ? null
            : () => _showAnswer(index),
        style: ButtonStyle(
          backgroundColor:
              MaterialStateProperty.all(bg ?? Theme.of(context).primaryColor),
          foregroundColor: MaterialStateProperty.all(Colors.white),
          shape: MaterialStateProperty.all(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        child: Align(
          alignment: Alignment.centerLeft,
          child: Text("${indexToLetter(index)}. $text",
              style: const TextStyle(fontSize: 16)),
        ),
      ),
    );
  }
}
