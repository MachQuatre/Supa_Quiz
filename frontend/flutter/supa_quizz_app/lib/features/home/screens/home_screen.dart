import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

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

  // Affiche une page d’accueil (logo + 2 boutons) quand on est sur l’onglet Jouer
  bool _showLanding = true;

  final List<Widget> _screens = const [
    PlayScreen(), // Page Jouer (contenu “in-app”)
    LeaderboardScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final body = (_currentIndex == 0 && _showLanding)
        ? _HomeLanding(
            onPlay: () {
              setState(() => _showLanding = false);
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const PlayScreen()),
              );
            },
            onTraining: () {
              Navigator.pushNamed(context, '/training');
            },
          )
        : _screens[_currentIndex];

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
          // ⚙️ Raccourci Admin (même domaine)
          IconButton(
            icon: const Icon(Icons.settings_suggest_rounded),
            tooltip: 'Admin',
            onPressed: () async {
              final uri = Uri.parse('/admin/login');
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
      body: body,
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: Colors.black,
        currentIndex: _currentIndex,
        selectedItemColor: Colors.purple,
        unselectedItemColor: Colors.grey,
        onTap: (index) => setState(() {
          _currentIndex = index;
          // Quand on revient sur “Jouer”, on réaffiche l’écran d’accueil
          if (_currentIndex == 0) _showLanding = true;
        }),
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

/// Écran d’accueil de l’onglet “Jouer”
/// Logo centré + 2 gros boutons en dessous : Jouer / Entrainement
class _HomeLanding extends StatelessWidget {
  final VoidCallback onPlay;
  final VoidCallback onTraining;

  const _HomeLanding({
    required this.onPlay,
    required this.onTraining,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // LOGO au centre, au-dessus des 2 boutons
              Image.asset(
                'assets/logo/LogoSupaQuiz.png',
                width: 160,
                height: 160,
                fit: BoxFit.contain,
                color: null, // garde les couleurs du logo
                // Si besoin : color: isDark ? Colors.white : null,
              ),
              const SizedBox(height: 24),

              // Deux gros boutons
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: onPlay,
                      icon: const Icon(Icons.play_arrow),
                      label: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text('Jouer', style: TextStyle(fontSize: 16)),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            isDark ? Colors.purple : Colors.deepPurple,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onTraining,
                      icon: const Icon(Icons.school),
                      label: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text('Entrainement',
                            style: TextStyle(fontSize: 16)),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                          color: isDark ? Colors.white70 : Colors.black54,
                          width: 1.5,
                        ),
                        foregroundColor: isDark ? Colors.white : Colors.black87,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
