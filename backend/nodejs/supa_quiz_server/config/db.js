const mongoose = require("mongoose");
require("dotenv").config();

const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("❌ Erreur: La variable MONGO_URI est undefined !");
  process.exit(1);
}
const safeUri = mongoURI.replace(/\/\/([^@]+)@/, "//***:***@");
console.log("🔌 Mongo target:", safeUri);

async function connectDB() {
  try {
-   await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
+   await mongoose.connect(mongoURI); // options dépréciées retirées
    console.log("✅ Connexion à MongoDB réussie !");
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB:", error);
    process.exit(1);
  }
}

module.exports = connectDB;
