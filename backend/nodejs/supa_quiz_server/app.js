// app.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const quizRoutes = require('./routes/quizRoutes'); // On importe le router
// const userRoutes = require('./routes/userRoutes'); // idem si tu en as besoin

const app = express();

// Connexion DB
connectDB();

// Middlewares
app.use(express.json());

// Routes
// On monte le router quizRoutes sur /api/quiz
app.use('/api/quiz', quizRoutes);

// Si tu as des routes user, on fera pareil
// app.use('/api/user', userRoutes);

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
