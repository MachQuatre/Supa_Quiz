import 'package:flutter/material.dart';
import '../controllers/quiz_controller.dart';
import '../widgets/timer_widget.dart';

class QuizScreen extends StatefulWidget {
  @override
  _QuizScreenState createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  final QuizController _quizController = QuizController();
  int questionKey = 0; // Ajout d'une clé pour forcer le reset du Timer

  void _goToNextQuestion() {
    setState(() {
      if (!_quizController.quizFinished) {
        _quizController.nextQuestion();
        questionKey++; // Change la clé pour réinitialiser le Timer
      }
    });
  }

  void _restartQuiz() {
    setState(() {
      _quizController.resetQuiz();
      questionKey = 0; // Réinitialiser la clé du Timer
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_quizController.quizFinished) {
      return Scaffold(
        appBar: AppBar(title: Text("Quiz Terminé")),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                "Bravo ! Tu as terminé le quiz ! 🎉",
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 20),
              ElevatedButton(
                onPressed: _restartQuiz,
                child: Text("Recommencer"),
              ),
            ],
          ),
        ),
      );
    }

    var question = _quizController.currentQuestion;

    return Scaffold(
      appBar: AppBar(title: Text("Quiz")),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            question.question,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 20),
          TimerWidget(onTimeUp: _goToNextQuestion, keyTrigger: questionKey),
          SizedBox(height: 20),
          ...List.generate(question.options.length, (index) {
            return ElevatedButton(
              onPressed: _goToNextQuestion,
              child: Text(question.options[index]),
            );
          }),
        ],
      ),
    );
  }
}
