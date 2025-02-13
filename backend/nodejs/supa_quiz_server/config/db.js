// Fichier : config/db.js

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Soit on prend l'URL dans .env, soit on met une URL fixe
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quizDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB connecté : ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur de connexion MongoDB : ${error}`);
    process.exit(1); // Arrête le process en cas d'erreur critique
  }
};

module.exports = connectDB;
