import 'package:flutter/material.dart';

class LeaderboardScreen extends StatefulWidget {
  @override
  _LeaderboardScreenState createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  String selectedTheme = "Général";
  final List<String> themes = ["Général", "Maths", "Histoire", "Science"];

  final Map<String, List<Map<String, dynamic>>> leaderboards = {
    "Général": [
      {"name": "Alice", "score": 1500},
      {"name": "Bob", "score": 1300},
      {"name": "Charlie", "score": 1200},
    ],
    "Maths": [
      {"name": "Alice", "score": 1400},
      {"name": "Charlie", "score": 1250},
    ],
  };

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: DropdownButton<String>(
            value: selectedTheme,
            dropdownColor: Colors.black,
            style: const TextStyle(color: Colors.white, fontSize: 16),
            items: themes.map((theme) {
              return DropdownMenuItem<String>(
                value: theme,
                child: Text(theme),
              );
            }).toList(),
            onChanged: (String? newTheme) {
              if (newTheme != null) {
                setState(() {
                  selectedTheme = newTheme;
                });
              }
            },
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: leaderboards[selectedTheme]?.length ?? 0,
            itemBuilder: (context, index) {
              final player = leaderboards[selectedTheme]![index];
              return ListTile(
                title:
                    Text(player["name"], style: TextStyle(color: Colors.white)),
                trailing: Text("${player["score"]} pts",
                    style: TextStyle(color: Colors.green)),
              );
            },
          ),
        ),
      ],
    );
  }
}
