// Fichier : app.js

require('dotenv').config();  // charge les variables depuis .env
const express = require('express');
const connectDB = require('./config/db');
const quizRoutes = require('./routes/quizRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Connexion à la base de données
connectDB();

// Middlewares
app.use(express.json());  // pour parser le JSON
// Si besoin : app.use(cors());  // si l’appli Flutter est sur un domaine différent

// Routes
app.use('/api/quiz', quizRoutes);
app.use('/api/user', userRoutes);

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
