lib/
├── main.dart
├── core/
│   ├── models/
│   │   └── question_model.dart
│   ├── services/
│   │   └── api_service.dart
│   └── utils/
│       └── timer_util.dart
├── features/
│   ├── home/
│   │   ├── screens/
│   │   │   └── home_screen.dart
│   │   └── widgets/
│   │       └── menu_button.dart
│   ├── quiz/
│   │   ├── screens/
│   │   │   └── quiz_screen.dart
│   │   ├── widgets/
│   │   │   ├── question_card.dart
│   │   │   └── timer_widget.dart
│   │   └── controllers/
│   │       └── quiz_controller.dart
│   ├── profile/
│   │   └── screens/
│   │       └── profile_screen.dart
│   └── leaderboard/
│       └── screens/
│           └── leaderboard_screen.dart
└── routes/
    └── app_routes.dart

## Détails des Dossiers :

### core : 
Contient la logique commune à tout le projet (modèles de données, services API, utilitaires comme le gestionnaire de timer).

### features :
Chaque fonctionnalité (accueil, quiz, profil, classement) est isolée pour plus de clarté.

### routes : 
Gère la navigation entre les écrans via un AppRoutes centralisé.

## Fonctionnalités Clés :
Récupération des questions via API :
api_service.dart gérera les appels API pour récupérer les questions et les réponses.

Chronomètre de 10 secondes par question :
timer_util.dart pour la logique du chronomètre. timer_widget.dart pour l'affichage dans l'interface.

Menu de navigation :
home_screen.dart avec des boutons pour accéder au classement, au profil, et au lancement de quiz.

Gestion des états :
Utilise Provider ou Riverpod pour une gestion d'état réactive.