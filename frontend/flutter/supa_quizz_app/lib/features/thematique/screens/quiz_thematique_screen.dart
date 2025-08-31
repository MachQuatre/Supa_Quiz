import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/models/user_session_model.dart';
import '../../../core/widgets/timer_widget.dart';
import '../../../core/services/api_user_sessions.dart';
import 'result_thematique_screen.dart';

class QuizThematiqueScreen extends StatefulWidget {
  final UserSessionModel session;
  final String questionnaireName;

  const QuizThematiqueScreen({
    super.key,
    required this.session,
    required this.questionnaireName,
  });

  @override
  State<QuizThematiqueScreen> createState() => _QuizThematiqueScreenState();
}

class _QuizThematiqueScreenState extends State<QuizThematiqueScreen> {
  // données immuables
  late final int _total;
  late final List<int?>
      _answers; // index choisi par question (ou null / -1 timeout)

  // progression + scoring (mêmes mécaniques que quiz privé)
  int _currentIndex = 0;
  int _scoreTotal = 0;
  int _pointsForCurrent = 0;
  int _streak = 0; // série de bonnes réponses (SSJ)
  int _bestStreak = 0;
  bool _showFeedback = false;
  bool _freezeTimer = false;
  int? _selectedIndex;
  int? _correctIndex;
  bool _finished = false;

  // timers
  Timer? _feedbackTimer;
  late DateTime _qStart; // début de la question courante
  late final DateTime _sessionStart;

  @override
  void initState() {
    super.initState();
    _total = widget.session.questions.length;
    _answers = List<int?>.filled(_total, null);
    _qStart = DateTime.now();
    _sessionStart = _qStart;
  }

  @override
  void dispose() {
    _feedbackTimer?.cancel();
    super.dispose();
  }

  // ---------- Sprites identiques au quiz privé ----------
  String _strikeBadge() {
    if (_streak >= 4) return "assets/sprites/SSJ4.png";
    switch (_streak) {
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
    if (_streak >= 4) return "assets/sprites/SSJ4Perso.png";
    switch (_streak) {
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

  // ---------- Mécanique identique au quiz privé ----------
  void _showAnswer(int? selectedIndex) {
    final q = widget.session.questions[_currentIndex];
    final correct = q.correctIndex ?? -1;

    final elapsedMs = DateTime.now().difference(_qStart).inMilliseconds;
    final isCorrect = (selectedIndex == correct) && correct >= 0;

    // même formule: 100 - (elapsed/100) clamp 0..100
    final earnedPoints =
        isCorrect ? (100 - (elapsedMs ~/ 100)).clamp(0, 100) : 0;

    setState(() {
      _selectedIndex = selectedIndex;
      _correctIndex = correct;
      _pointsForCurrent = earnedPoints;
      _scoreTotal += earnedPoints;
      _showFeedback = true;
      _freezeTimer = true;

      if (isCorrect) {
        _streak += 1;
        if (_streak > _bestStreak) _bestStreak = _streak;
      } else {
        _streak = 0;
      }

      _answers[_currentIndex] = selectedIndex ?? -1; // -1 pour timeout
    });

    // auto-continue après 3s (pas de bouton "suivant")
    _feedbackTimer?.cancel();
    _feedbackTimer = Timer(const Duration(seconds: 3), _nextOrFinish);
  }

  void _nextOrFinish() {
    if (_currentIndex + 1 < _total) {
      setState(() {
        _currentIndex++;
        _selectedIndex = null;
        _correctIndex = null;
        _pointsForCurrent = 0;
        _showFeedback = false;
        _freezeTimer = false;
        _qStart = DateTime.now();
      });
    } else {
      setState(() => _finished = true);
      _finishAndExit();
    }
  }

  Future<void> _finishAndExit() async {
    try {
      final totalElapsedMs =
          DateTime.now().difference(_sessionStart).inMilliseconds;

      final resEnd = await ApiUserSessions.endSession(
        sessionId: widget.session.id,
        scoreTotal: _scoreTotal,
        answers: _answers.map((e) => e ?? -1).toList(),
        elapsedMs: totalElapsedMs,
        streakMax: _bestStreak,
      );

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
            builder: (_) => ResultThematiqueScreen(result: resEnd)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur lors de la finalisation: $e')),
      );
      Navigator.of(context).pop();
    }
  }

  // ---------- UI ----------
  @override
  Widget build(BuildContext context) {
    if (_finished) {
      // petite page tampon si l’API est lente ; normalement on navigue direct
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final q = widget.session.questions[_currentIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text("Question ${_currentIndex + 1}/$_total"),
      ),
      body: Stack(
        children: [
          // sprite en haut à gauche
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
                // énoncé
                Text(
                  q.text,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),

                // timer 10s, gelé pendant feedback, reset sur changement de question
                TimerWidget(
                  duration: 10,
                  keyTrigger: _currentIndex,
                  freeze: _showFeedback || _freezeTimer,
                  onTimeUp: () => _showAnswer(null),
                ),
                const SizedBox(height: 16),

                // options
                for (int i = 0; i < q.options.length; i++)
                  _answerButton(i, q.options[i]),

                const SizedBox(height: 16),

                // feedback + commentateur en bas (comme privé)
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
                              const SizedBox(height: 4),
                              Text("Score total : $_scoreTotal",
                                  style: const TextStyle(fontSize: 14)),
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
          child: Text("${_indexToLetter(index)}. $text",
              style: const TextStyle(fontSize: 16)),
        ),
      ),
    );
  }

  String _indexToLetter(int i) => String.fromCharCode(65 + i); // A,B,C,D
}
