import 'package:flutter/material.dart';
import 'quiz_screen.dart';

class PlayScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: ElevatedButton(
        // Ajout du `child:`
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => QuizScreen()),
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.purple,
          foregroundColor:
              Colors.white, // Texte blanc pour meilleure visibilité
          padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
        ),
        child: const Text(
          'Commencer le Quiz',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
