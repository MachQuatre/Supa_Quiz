import 'package:flutter/material.dart';
import '../../../core/services/api_service.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});
  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  final String generalLabel = "Général";
  String _selected = "Général";
  List<String> _themes = [];
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    try {
      final themes = await ApiService.fetchLeaderboardThemes();
      _themes = [generalLabel, ...themes];
      await _loadLeaderboard(); // charge "Général" par défaut
    } catch (e) {
      _themes = [generalLabel];
      _rows = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadLeaderboard() async {
    setState(() => _loading = true);
    try {
      if (_selected == generalLabel) {
        _rows = await ApiService.fetchLeaderboardGlobal(limit: 10);
      } else {
        _rows = await ApiService.fetchLeaderboardByTheme(_selected, limit: 10);
      }
    } catch (e) {
      _rows = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Leaderboard")),
      body: RefreshIndicator(
        onRefresh: _loadLeaderboard,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                const Text("Classement :",
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(width: 12),
                DropdownButton<String>(
                  value: _selected,
                  dropdownColor: Colors.black87, // ✅ fond du menu
                  style: const TextStyle(
                      color: Colors.white), // ✅ texte sélectionné en blanc
                  items: _themes
                      .map((t) => DropdownMenuItem(
                          value: t,
                          child: Text(t,
                              style: const TextStyle(color: Colors.white))))
                      .toList(),
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() => _selected = v);
                    _loadLeaderboard();
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (_loading)
              const Center(
                  child: Padding(
                      padding: EdgeInsets.all(24),
                      child: CircularProgressIndicator()))
            else if (_rows.isEmpty)
              const Center(child: Text("Aucun résultat"))
            else
              Column(
                children: _rows.asMap().entries.map((e) {
                  final rank = e.key + 1;
                  final row = e.value;
                  final name = (row["username"] ?? "Joueur").toString();
                  final total = (row["totalScore"] ?? 0).toString();
                  final avatar = row["avatar"]?.toString();

                  return Card(
                    child: ListTile(
                      leading: _rankIcon(rank, avatar),
                      title: Text("$rank. $name"),
                      trailing: Text("$total pts",
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _rankIcon(int rank, String? avatar) {
    Widget base = CircleAvatar(
      radius: 18,
      backgroundImage: (avatar != null && avatar.startsWith("http"))
          ? NetworkImage(avatar)
          : (avatar != null ? AssetImage(avatar) as ImageProvider : null),
      child: avatar == null ? Text("$rank") : null,
    );

    if (rank == 1)
      return Stack(children: [
        base,
        const Positioned(right: -2, bottom: -2, child: Icon(Icons.emoji_events))
      ]);
    if (rank == 2)
      return Stack(children: [
        base,
        const Positioned(
            right: -2, bottom: -2, child: Icon(Icons.military_tech))
      ]);
    if (rank == 3)
      return Stack(children: [
        base,
        const Positioned(
            right: -2, bottom: -2, child: Icon(Icons.workspace_premium))
      ]);
    return base;
  }
}
