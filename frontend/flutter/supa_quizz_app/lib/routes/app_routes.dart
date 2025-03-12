import 'package:flutter/material.dart';
import '../features/home/screens/home_screen.dart';
import '../features/quiz/screens/quiz_screen.dart';
import '../features/leaderboard/screens/leaderboard_screen.dart';
import '../features/profile/screens/profile_screen.dart';

class AppRoutes {
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case '/':
        return MaterialPageRoute(builder: (_) => HomeScreen());

      case '/quiz':
        final String selectedTheme = settings.arguments as String;
        return MaterialPageRoute(
          builder: (_) => QuizScreen(selectedTheme: selectedTheme),
        );

      case '/leaderboard':
        return MaterialPageRoute(builder: (_) => LeaderboardScreen());

      case '/profile':
        return MaterialPageRoute(builder: (_) => ProfileScreen());

      default:
        return MaterialPageRoute(builder: (_) => HomeScreen());
    }
  }
}
