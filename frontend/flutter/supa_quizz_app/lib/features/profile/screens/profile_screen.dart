import 'package:flutter/material.dart';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:fl_chart/fl_chart.dart';

class ProfileScreen extends StatefulWidget {
  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String userName = "Utilisateur";
  File? _profileImage;

  // Ajout de la sélection de thème
  String selectedTheme = 'Général';
  List<String> availableThemes = [
    'Général',
    'Mathématiques',
    'Science',
    'Histoire'
  ]; // Exemple de thèmes

  // Scores pour chaque thème
  Map<String, List<Map<String, dynamic>>> scoresByTheme = {
    'Général': [
      {"date": "01/02", "score": 1200},
      {"date": "02/02", "score": 1400},
      {"date": "03/02", "score": 1800},
      {"date": "04/02", "score": 2000},
      {"date": "05/02", "score": 2300},
    ],
    'Mathématiques': [
      {"date": "01/02", "score": 1000},
      {"date": "02/02", "score": 1500},
    ],
    'Science': [
      {"date": "01/02", "score": 1100},
      {"date": "02/02", "score": 1150},
    ],
    'Histoire': [
      {"date": "01/02", "score": 1050},
      {"date": "02/02", "score": 1200},
    ],
  };

  void _editProfile() {
    TextEditingController nameController =
        TextEditingController(text: userName);

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text("Modifier le Profil"),
          content: TextField(
            controller: nameController,
            decoration: const InputDecoration(labelText: "Nom d'utilisateur"),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text("Annuler")),
            TextButton(
              onPressed: () {
                setState(() {
                  userName = nameController.text;
                });
                Navigator.pop(context);
              },
              child: const Text("Sauvegarder"),
            ),
          ],
        );
      },
    );
  }

  Future<void> _pickImage() async {
    FilePickerResult? result =
        await FilePicker.platform.pickFiles(type: FileType.image);
    if (result != null && result.files.single.path != null) {
      setState(() {
        _profileImage = File(result.files.single.path!);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Profil',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Profile image and editing
          Stack(
            alignment: Alignment.center,
            children: [
              CircleAvatar(
                radius: 60,
                backgroundColor: Colors.purple,
                backgroundImage:
                    _profileImage != null ? FileImage(_profileImage!) : null,
                child: _profileImage == null
                    ? const Icon(Icons.person, size: 60, color: Colors.white)
                    : null,
              ),
              Positioned(
                bottom: 5,
                right: 5,
                child: GestureDetector(
                  onTap: _pickImage,
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: Colors.black54,
                    child:
                        const Icon(Icons.edit, color: Colors.white, size: 18),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            userName,
            style: const TextStyle(fontSize: 24, color: Colors.white),
          ),
          const SizedBox(height: 8),
          DropdownButton<String>(
            value: selectedTheme,
            onChanged: (String? newValue) {
              setState(() {
                selectedTheme = newValue!;
              });
            },
            items:
                availableThemes.map<DropdownMenuItem<String>>((String value) {
              return DropdownMenuItem<String>(
                value: value,
                child: Text(value),
              );
            }).toList(),
          ),
          const Text(
            'Score Total: 2300 pts',
            style: TextStyle(fontSize: 16, color: Colors.grey),
          ),
          const SizedBox(height: 20),
          const Text(
            'Progression des Scores',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 20),
          // Score graph
          SizedBox(
            height: 250,
            width: double.infinity,
            child: LineChart(
              LineChartData(
                backgroundColor: Colors.grey[850],
                borderData: FlBorderData(
                  show: true,
                  border: Border.all(color: Colors.grey, width: 1),
                ),
                gridData: FlGridData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, _) => Text(
                        '${value.toInt()} pts',
                        style:
                            const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                      interval: 500,
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, _) {
                        final labels = scoresByTheme[selectedTheme]!
                            .map((score) => score["date"].toString())
                            .toList();
                        return Text(
                          labels[value.toInt() % labels.length],
                          style: const TextStyle(
                              color: Colors.white, fontSize: 12),
                        );
                      },
                      interval: 1,
                    ),
                  ),
                ),
                lineBarsData: [
                  LineChartBarData(
                    spots: scoresByTheme[selectedTheme]!
                        .asMap()
                        .entries
                        .map((entry) => FlSpot(entry.key.toDouble(),
                            entry.value["score"].toDouble()))
                        .toList(),
                    isCurved: true,
                    gradient: LinearGradient(
                      colors: [Colors.purple, Colors.purple.withOpacity(0.5)],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                    dotData: FlDotData(show: true),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        colors: [
                          Colors.purple.withOpacity(0.5),
                          Colors.purple.withOpacity(0.1),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Historique des Scores',
            style: TextStyle(
                fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 10),
          // Score history table
          Container(
            decoration: BoxDecoration(
              color: Colors.grey[900],
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              children: scoresByTheme[selectedTheme]!
                  .map(
                    (entry) => ListTile(
                      title: Text(
                        "Date : ${entry['date']}",
                        style: TextStyle(color: Colors.white),
                      ),
                      trailing: Text(
                        "${entry['score']} pts",
                        style: TextStyle(
                            color: Colors.green, fontWeight: FontWeight.bold),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _editProfile,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple,
              padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30),
              ),
            ),
            child: const Text(
              'Modifier le Profil',
              style: TextStyle(fontSize: 16),
            ),
          ),
        ],
      ),
    );
  }
}
