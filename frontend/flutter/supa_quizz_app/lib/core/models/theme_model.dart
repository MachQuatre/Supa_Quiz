class ThemeModel {
  final String id;
  final String name;
  final bool isActive;
  ThemeModel({required this.id, required this.name, required this.isActive});

  factory ThemeModel.fromJson(Map<String, dynamic> j) => ThemeModel(
        id: j['_id'] as String,
        name: j['name'] as String,
        isActive: (j['isActive'] ?? true) as bool,
      );
}
