import 'package:flutter/material.dart';
import '../../../core/services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String? _username;
  String? _email;
  String? _userId;
  String? _profilePic; // avatar choisi (asset path ou URL)
  int _totalScore = 0;

  /// Historique (10 dernières)
  List<Map<String, dynamic>> _history = [];

  bool _loading = true;

  // Avatars prédéfinis disponibles
  // ProfileScreen.dart (extraits)
  final Map<String, String> _achievementAvatarMap = {
    "A1": "assets/achievements/ach1.png",
    "A2": "assets/achievements/ach2.png",
    "A3": "assets/achievements/ach3.png",
  };

  List<String> _baseAvatars = const [
    "assets/avatars/avatar1.png",
    "assets/avatars/avatar2.png",
  ];

  List<String> _avatars = [];

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  int _asInt(dynamic v) {
    if (v is int) return v;
    if (v is double) return v.toInt();
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v) ?? 0;
    return 0;
    // (option : logger si valeur inattendue)
  }

  Future<void> _loadProfile() async {
    try {
      // 1) Profil (score_total, avatar, achievements, etc.)
      final me = await ApiService.getMe();

      // 2) Historique (10 dernières)
      final summary = await ApiService.fetchMySummary();
      final List<dynamic> recent =
          (summary['recentSessions'] as List?) ?? const [];

      final mapped = recent.map((e) {
        final m = Map<String, dynamic>.from(e as Map);
        final dateAny =
            m['date'] ?? m['_date'] ?? m['end_time'] ?? m['start_time'];
        return <String, dynamic>{
          'quizTitle': m['quizTitle'] ?? 'Quiz',
          'score': _asInt(m['score']),
          'date': dateAny, // ISO string ou DateTime
          'gameCode': m['gameCode'], // peut être null
          'user_session_id': m['user_session_id'],
        };
      }).toList();

      // 3) Achievements -> avatars débloqués (tolérant aux vieux formats)
      final dynamic rawAch = me["achievement_state"];
      final List<String> unlockedCodes = (rawAch is List)
          ? rawAch.map((e) => e.toString()).toList()
          : <String>[]; // "aucun" (String) ou null -> aucune déco

      final Iterable<String> unlockedAvatars = unlockedCodes
          .map((code) => _achievementAvatarMap[
              code]) // nécessite la map définie dans le fichier
          .whereType<String>();

      setState(() {
        _username = me["username"];
        _email = me["email"];
        _userId = me["user_id"];
        _profilePic = me["avatar_choisi"]; // stocké en DB
        _totalScore = _asInt(me["score_total"]); // ✅ depuis users.score_total
        _history = mapped;

        // ✅ avatars finaux (base + achievements) sans doublons
        _avatars = {..._baseAvatars, ...unlockedAvatars}.toList();

        _loading = false;
      });
    } catch (e) {
      debugPrint("❌ Erreur chargement profil: $e");
      setState(() => _loading = false);
    }
  }

  Future<void> _chooseAvatar(String newAvatar) async {
    if (_userId == null) return;
    try {
      final updated = await ApiService.updateAvatar(_userId!, newAvatar);
      if (updated != null) {
        setState(() => _profilePic = updated);
      }
    } catch (e) {
      debugPrint("❌ Erreur update avatar: $e");
    }
  }

  String _formatDate(dynamic iso) {
    if (iso == null) return "-";
    DateTime? d = (iso is DateTime) ? iso : DateTime.tryParse(iso.toString());
    if (d == null) return "-";
    final local = d.toLocal();
    String two(int v) => v.toString().padLeft(2, '0');
    return "${two(local.day)}/${two(local.month)}/${local.year} ${two(local.hour)}:${two(local.minute)}";
  }

  bool _isSelectedAvatar(String avatarPath) {
    if (_profilePic == null) return false;
    return _profilePic == avatarPath;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text("Mon Profil")),
      body: RefreshIndicator(
        onRefresh: _loadProfile,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // Avatar actuel
              CircleAvatar(
                radius: 50,
                backgroundImage: _profilePic != null
                    ? (_profilePic!.startsWith("http")
                        ? NetworkImage(_profilePic!)
                        : AssetImage(_profilePic!) as ImageProvider)
                    : null,
                child: _profilePic == null
                    ? const Icon(Icons.person, size: 50)
                    : null,
              ),
              const SizedBox(height: 10),

              // Nom + email
              Text(
                _username ?? "Utilisateur",
                style:
                    const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              Text(_email ?? "", style: const TextStyle(color: Colors.grey)),

              const SizedBox(height: 20),

              // Sélecteur d’avatars
              const Text("Choisir un avatar :",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: _avatars.map((avatar) {
                  final selected = _isSelectedAvatar(avatar);
                  return GestureDetector(
                    onTap: () => _chooseAvatar(avatar),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Container(
                        padding: selected
                            ? const EdgeInsets.all(3)
                            : EdgeInsets.zero,
                        decoration: selected
                            ? BoxDecoration(
                                shape: BoxShape.circle,
                                border:
                                    Border.all(color: Colors.purple, width: 3),
                              )
                            : null,
                        child: CircleAvatar(
                            radius: 30, backgroundImage: AssetImage(avatar)),
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 20),

              // ✅ Score total lu depuis users.score_total (me)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.emoji_events),
                  title: const Text("Score total"),
                  trailing: Text("$_totalScore pts",
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),

              const SizedBox(height: 20),

              // Historique des parties (10 dernières)
              const Align(
                alignment: Alignment.centerLeft,
                child: Text("Dernières parties",
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 10),

              if (_history.isEmpty)
                const Text("Aucune partie jouée récemment")
              else
                Column(
                  children: _history.map((h) {
                    final title = (h["quizTitle"] ?? "Quiz").toString();
                    final score = _asInt(h["score"]).toString();
                    final dateText = _formatDate(h["date"]);
                    final gameCode = (h["gameCode"] ?? "").toString();
                    final hasCode = gameCode.trim().isNotEmpty;

                    return Card(
                      child: ListTile(
                        leading: const Icon(Icons.quiz),
                        title: Text(title),
                        subtitle: Text(
                          hasCode
                              ? "Score : $score • Code : $gameCode"
                              : "Score : $score",
                        ),
                        trailing: Text(dateText,
                            style: const TextStyle(color: Colors.grey)),
                      ),
                    );
                  }).toList(),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
