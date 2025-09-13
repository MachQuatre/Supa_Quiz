// backend/nodejs/supa_quiz_server/config/db.js
require("dotenv").config();
const mongoose = require("mongoose");

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
    console.error("❌ Erreur: La variable MONGO_URI est undefined !");
    process.exit(1);
}

// (ajout)
const safeUri = mongoURI.replace(/\/\/([^@]+)@/, "//***:***@");
console.log("🔌 Mongo target:", safeUri);

const connectDB = async () => {
    try {
        await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ Connexion à MongoDB réussie !");
    } catch (error) {
        console.error("❌ Erreur de connexion MongoDB:", error);
        process.exit(1);
    }
};

module.exports = connectDB;
