import 'package:flutter/material.dart';
import '../features/home/screens/login_screen.dart';
import '../features/home/screens/signup_screen.dart';
import '../features/home/screens/home_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/quiz/screens/quiz_screen.dart';
import '../features/thematique/screens/theme_selector_screen.dart';

import '../features/training/presentation/training_page.dart';
import '../features/training/presentation/training_session_page.dart';

class AppRoutes {
  static Map<String, WidgetBuilder> getRoutes() {
    return {
      '/login': (context) => const LoginScreen(),
      '/signup': (context) => const SignupScreen(),
      '/thematique': (context) => const ThemeSelectorScreen(),
      '/home': (context) => HomeScreen(),
      '/quiz': (context) =>
          QuizScreen(quizData: {'title': 'Quiz', 'questions': []}),

      // ✅ routes d’entrainement
      '/training': (context) => const TrainingPage(),
      '/training/session': (context) {
        final args = ModalRoute.of(context)!.settings.arguments;
        List<String> ids = const [];
        if (args is Map && args['questionIds'] is List) {
          ids = (args['questionIds'] as List).map((e) => e.toString()).toList();
        } else if (args is List) {
          ids = args.map((e) => e.toString()).toList();
        }
        return TrainingSessionPage(questionIds: ids);
      },
    };
  }
}
