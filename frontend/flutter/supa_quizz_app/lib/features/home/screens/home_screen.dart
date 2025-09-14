import 'package:flutter/material.dart';
import '../../../core/services/auth_service.dart';
import '../../home/screens/login_screen.dart';
import '../../leaderboard/screens/leaderboard_screen.dart';
import '../../profile/screens/profile_screen.dart';
import '../../quiz/screens/play_screen.dart';
import 'package:url_launcher/url_launcher.dart';

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
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/logo/LogoSupaQuiz.png',
              height: 28,
              fit: BoxFit.contain,
            ),
            const SizedBox(width: 8),
            const Text('Quiz App'),
          ],
        ),
        backgroundColor: Colors.black,
        actions: [
          // ⚙️ Raccourci Admin
          IconButton(
            icon: const Icon(Icons.settings_suggest_rounded),
            tooltip: 'Admin',
            onPressed: () async {
              final uri = Uri.parse('/admin/login'); // même domaine
              await launchUrl(
                uri,
                mode: LaunchMode.platformDefault,
                webOnlyWindowName: '_self',
              );
            },
          ),
          // 🎓 Entrainement
          IconButton(
            icon: const Icon(Icons.school),
            tooltip: 'Entrainement',
            onPressed: () {
              Navigator.pushNamed(context, '/training');
            },
          ),
          // 🔒 Déconnexion
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
