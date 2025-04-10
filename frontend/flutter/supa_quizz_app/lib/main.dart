import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'routes/app_routes.dart';
import 'features/home/screens/home_screen.dart';
import 'features/auth/screens/login_screen.dart'; // à créer si pas encore

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token') != null;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: isLoggedIn(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          // Chargement en cours
          return MaterialApp(
            home: Scaffold(
              backgroundColor: Colors.black,
              body: Center(
                child: CircularProgressIndicator(color: Colors.purple),
              ),
            ),
          );
        }

        final isAuth = snapshot.data!;
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'Supa Quizz',
          theme: ThemeData.dark().copyWith(
            scaffoldBackgroundColor: Colors.black,
            primaryColor: Colors.purple,
            textTheme: const TextTheme(
              bodyMedium: TextStyle(color: Colors.white),
            ),
          ),
          // ❌ Supprime cette ligne
          // initialRoute: '/',

          routes: AppRoutes.getRoutes(),
          home: isAuth ? HomeScreen() : LoginScreen(), // ✅ ça suffit ici
        );
      },
    );
  }
}
