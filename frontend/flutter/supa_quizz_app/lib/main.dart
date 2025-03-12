import 'package:flutter/material.dart';
import 'routes/app_routes.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Supa Quizz',
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: Colors.black, // Fond noir
        primaryColor: Colors.purple,
        textTheme: TextTheme(
          bodyMedium: TextStyle(
              color: Colors.white), // Texte en blanc pour la lisibilité
        ),
      ),
      initialRoute: '/',
      routes: AppRoutes.getRoutes(),
    );
  }
}
