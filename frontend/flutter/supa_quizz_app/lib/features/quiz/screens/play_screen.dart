import 'package:flutter/material.dart';

class PlayScreen extends StatefulWidget {
  @override
  _PlayScreenState createState() => _PlayScreenState();
}

class _PlayScreenState extends State<PlayScreen> {
  String selectedTheme = "Général"; // Thème par défaut
  final List<String> themes = ["Général", "Maths", "Histoire", "Science"];

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            "Choisissez un thème",
            style: TextStyle(fontSize: 18, color: Colors.white),
          ),
          SizedBox(height: 10),
          DropdownButton<String>(
            value: selectedTheme,
            dropdownColor: Colors.black,
            style: TextStyle(color: Colors.white, fontSize: 16),
            iconEnabledColor: Colors.white,
            items: themes.map((String theme) {
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
          SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {
              Navigator.pushNamed(
                context,
                '/quiz',
                arguments: selectedTheme, // Envoie le thème sélectionné
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple,
              padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30),
              ),
            ),
            child: const Text(
              'Commencer le Quiz',
              style: TextStyle(fontSize: 18),
            ),
          ),
        ],
      ),
    );
  }
}
