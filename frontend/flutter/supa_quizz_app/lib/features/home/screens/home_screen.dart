import 'package:flutter/material.dart';
import '../../../core/services/auth_service.dart';
import '../../home/screens/login_screen.dart';
import '../../leaderboard/screens/leaderboard_screen.dart';
import '../../profile/screens/profile_screen.dart';
import '../../quiz/screens/play_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    PlayScreen(), // Page Jouer
    LeaderboardScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Quiz App',
        ),
        backgroundColor: Colors.black,
        actions: [
          // 🎓 Bouton Entrainement
          IconButton(
            icon: const Icon(Icons.school),
            tooltip: 'Entrainement',
            onPressed: () {
              Navigator.pushNamed(context, '/training');
            },
          ),

          // 🔒 Déconnexion (conservé)
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Déconnexion',
            onPressed: () async {
              await AuthService.logout();
              if (!context.mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (_) => false,
              );
            },
          ),

          // ❌ Clé (Quiz Privé) retirée comme demandé
          // if (_currentIndex == 0)
          //   IconButton(
          //     icon: const Icon(Icons.vpn_key),
          //     tooltip: 'Quiz Privé',
          //     onPressed: () { ... },
          //   ),
        ],
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: Colors.black,
        currentIndex: _currentIndex,
        selectedItemColor: Colors.purple,
        unselectedItemColor: Colors.grey,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.play_arrow),
            label: 'Jouer',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.leaderboard),
            label: 'Classement',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}
