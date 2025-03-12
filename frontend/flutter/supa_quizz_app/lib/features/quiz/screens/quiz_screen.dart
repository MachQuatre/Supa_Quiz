import 'package:flutter/material.dart';
import '../controllers/quiz_controller.dart';
import '../widgets/timer_widget.dart';

class QuizScreen extends StatefulWidget {
  @override
  _QuizScreenState createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  final QuizController _quizController = QuizController();
  int questionKey = 0; // Déclencheur pour réinitialiser le timer

  void _goToNextQuestion(int selectedAnswerIndex) {
    setState(() {
      _quizController.nextQuestion(selectedAnswerIndex);

      // Si le quiz est terminé, recharger l'écran pour afficher l'écran de fin
      if (_quizController.quizFinished) {
        return;
      }

      questionKey++; // Change la clé pour réinitialiser le Timer
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
                "Bravo ! Tu as terminé le quiz 🎉",
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 20),
              Text(
                "Score final : ${_quizController.score} points",
                style: TextStyle(
                    fontSize: 18,
                    color: Colors.green,
                    fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _quizController.resetQuiz();
                    questionKey = 0;
                  });
                },
                child: Text("Recommencer"),
              ),
              SizedBox(height: 10),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.grey),
                child: Text("Retour à l'accueil"),
              ),
            ],
          ),
        ),
      );
    }

    var question = _quizController.currentQuestion;

    return Scaffold(
      appBar: AppBar(
        title: Text("Quiz"),
        actions: [
          Padding(
            padding: const EdgeInsets.all(10.0),
            child: Text(
              "Score : ${_quizController.score}",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: MediaQuery.of(context).size.width * 0.8,
              height: 120,
              alignment: Alignment.center,
              child: Text(
                question.question,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
            ),
            SizedBox(height: 20),
            TimerWidget(
              onTimeUp: () {
                setState(() {
                  _quizController.nextQuestion(-1);
                  if (_quizController.quizFinished) {
                    return;
                  }
                  questionKey++;
                });
              },
              keyTrigger: questionKey,
            ),
            SizedBox(height: 20),
            SizedBox(
              width: MediaQuery.of(context).size.width * 0.8,
              child: Column(
                children: List.generate(question.options.length, (index) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        minimumSize: Size(double.infinity, 50),
                      ),
                      onPressed: () => _goToNextQuestion(index),
                      child: Text(question.options[index]),
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
