import 'package:flutter/material.dart';
import '../features/home/screens/home_screen.dart';
import '../features/quiz/screens/quiz_screen.dart';

class AppRoutes {
  static Map<String, WidgetBuilder> getRoutes() {
    return {
      '/': (context) => HomeScreen(),
      '/quiz': (context) => QuizScreen(),
    };
  }
}
