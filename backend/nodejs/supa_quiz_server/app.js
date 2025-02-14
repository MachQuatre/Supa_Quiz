// app.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const quizRoutes = require('./routes/quizRoutes'); 
const scoreRoutes = require('./routes/scoreRoutes');
const classRoutes = require('./routes/ClassRoutes'); // Import des routes Class

const app = express();

// Connexion DB
connectDB();

// Middlewares
app.use(express.json());

// Routes
app.use('/api/quiz', quizRoutes);
app.use('/api/class', classRoutes); // Monte les routes Class sur /api/class
// 2) On monte le router “scoreRoutes” sur /api/scores
app.use('/api/scores', scoreRoutes);

// userRoutes éventuelles
// app.use('/api/user', userRoutes);

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur en écoute sur le port ${PORT}`);
});
