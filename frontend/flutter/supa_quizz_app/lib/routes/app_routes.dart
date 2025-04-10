import 'package:flutter/material.dart';

import '../features/home/screens/home_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/quiz/screens/quiz_screen.dart';
import '../features/leaderboard/screens/leaderboard_screen.dart';
import '../features/auth/screens/login_screen.dart'; // <-- Ajouté ici

class AppRoutes {
  static Map<String, WidgetBuilder> getRoutes() {
    return {
      //'/': (context) => LoginScreen(), // Route par défaut
      '/home': (context) => HomeScreen(),
      '/quiz': (context) => QuizScreen(),
      '/profile': (context) => ProfileScreen(),
      '/leaderboard': (context) => LeaderboardScreen(),
    };
  }
}
