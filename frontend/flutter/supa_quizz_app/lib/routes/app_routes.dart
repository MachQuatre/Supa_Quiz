import 'package:flutter/material.dart';
import '../features/home/screens/login_screen.dart';
import '../features/home/screens/signup_screen.dart';
import '../features/home/screens/home_screen.dart';
import '../features/quiz/screens/quiz_screen.dart';
import '../features/thematique/screens/theme_selector_screen.dart';

class AppRoutes {
  static Map<String, WidgetBuilder> getRoutes() {
    return {
      // ⚡ Supprimé "/" car déjà géré par home dans MaterialApp
      '/login': (context) => const LoginScreen(),
      '/signup': (context) => const SignupScreen(),
      '/thematique': (context) => const ThemeSelectorScreen(),
      '/home': (context) => HomeScreen(),
      '/quiz': (context) => QuizScreen(
            quizData: {
              'title': 'Quiz',
              'questions': [],
            },
          ),
    };
  }
}
