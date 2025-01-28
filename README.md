# Supa_Quiz

**SupaQuiz** est une plateforme interactive de quiz éducatif conçue pour rendre l'apprentissage amusant et engageant grâce à l'utilisation de technologies modernes et d'une interface conviviale. Le projet combine l'IA, la gamification et des outils puissants pour offrir une expérience personnalisée et dynamique aux utilisateurs.

---

## 🚀 Fonctionnalités principales

### Utilisateurs standards :
- Participer à des quiz sur différents thèmes et niveaux de difficulté.
- Voir leur progression, leurs scores et leur classement global.
- Obtenir des badges en fonction de leurs performances.

### Utilisateurs avancés :
- Créer leurs propres questionnaires avec des questions personnalisées.
- Générer un code pour permettre à d'autres utilisateurs de participer à leurs quiz.

### Fonctionnalités IA :
- Analyse des performances pour identifier les faiblesses de l'utilisateur.
- Suggestions personnalisées pour améliorer les compétences sur des thèmes spécifiques.

---

## 📂 Architecture technique

Le projet est divisé en plusieurs composants utilisant des technologies différentes, organisés comme suit :

### Backend principal (Node.js + MongoDB)
- Gestion des utilisateurs : inscription, connexion, profils.
- Gestion des sessions de quiz et calcul des scores.
- Stockage des données (historique des parties, scores, classements) dans MongoDB.

### Stockage et analyse de données (Hadoop)
- Stockage des réponses des utilisateurs pour une analyse à grande échelle.
- Préparation des données pour les algorithmes IA.

### Intelligence artificielle (Python)
- Analyse des performances des utilisateurs.
- Ajustement dynamique de la difficulté des questions.
- Suggestions personnalisées grâce à des algorithmes de machine learning.

### Interface administrateur et gestion des badges (Go)
- Suivi des statistiques globales (utilisateurs, scores, performances).
- Création et gestion des badges.

### Application mobile (Flutter)
- Interface utilisateur principale pour participer aux quiz.
- Affichage des classements, des scores et des badges.
- Fonctionnalités multi-plateformes (iOS et Android).

---

## 📦 Structure des dossiers

```
/SupaQuiz
├── backend
│   ├── nodejs      # Backend principal
│   └── hadoop      # Stockage et analyse de données
├── ai
│   └── python      # Scripts d'intelligence artificielle
├── frontend
│   ├── flutter     # Application mobile
│   └── golang      # Interface administrateur
├── docs            # Documentation
├── .github
│   └── workflows   # Workflows GitHub Actions
└── README.md       # Documentation principale
```

---

## 🛠️ Installation et exécution

### Prérequis
Assurez-vous d'avoir installé les outils suivants :
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Python 3](https://www.python.org/)
- [Hadoop](https://hadoop.apache.org/)
- [Go](https://go.dev/)
- [Flutter](https://flutter.dev/)

---

## 💡 Auteurs
- Makhlouf BENMAMMAR
- Rémi COSTET
