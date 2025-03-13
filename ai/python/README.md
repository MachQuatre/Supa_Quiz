📁 Organisation des fichiers du projet Python
📁 supa_quizz_ai/
├── 📁 api/ (Gestion de l’API Flask)
│ ├── server.py (Lancement du serveur API)
│ ├── routes.py (Endpoints de l’API)
├── 📁 models/ (Machine Learning & Data Processing)
│ ├── ml_model.py (Modèle de prédiction)
│ ├── data_processing.py (Préparation des données)
├── 📁 database/ (Gestion MongoDB)
│ ├── mongo_connector.py (Connexion et requêtes)
├── 📁 utils/ (Configuration et outils)
│ ├── config.py (Paramètres globaux)
├── main.py (Point d’entrée du script Python)

Endpoints de l'API Flask 🖥️
Méthode	URL	Fonctionnalité
GET	/player/<id>	Récupérer les performances d'un joueur
POST	/predict	Prédire la difficulté optimale pour un joueur
POST	/update_score	Mettre à jour les scores après un quiz
Prochaines étapes 🚀
Créer l’API Flask avec server.py et routes.py.
Connecter l’API à MongoDB (mongo_connector.py).
Développer le modèle de Machine Learning (ml_model.py).
Intégrer la prédiction à l’API (/predict).