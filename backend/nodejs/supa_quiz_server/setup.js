require("dotenv").config();
const mongoose = require("mongoose");

const DB_NAME = "quiz_app";
const mongoURI = process.env.MONGO_URI || `mongodb://localhost:27017/${DB_NAME}`;

const collections = ["Users", "Quizzes", "Questions", "Sessions", "Responses"];

const indexes = {
    Users: [{ email: 1 }],
    Sessions: [{ user_id: 1 }, { questionnaire_id: 1 }],
    Responses: [{ session_id: 1 }, { user_id: 1 }]
};

const indexOptions = {
    Users: [{ unique: true }],
};

async function setupDatabase() {
    try {
        await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log(`✅ Connexion à MongoDB réussie : ${mongoURI}`);

        const db = mongoose.connection.db;
        const existingCollections = await db.listCollections().toArray();
        const existingNames = existingCollections.map(col => col.name);

        for (const collection of collections) {
            if (!existingNames.includes(collection)) {
                await db.createCollection(collection);
                console.log(`🆕 Collection créée : ${collection}`);
            } else {
                console.log(`✅ Collection existante : ${collection}`);
            }
        }

        for (const [collection, indexList] of Object.entries(indexes)) {
            for (let i = 0; i < indexList.length; i++) {
                const index = indexList[i];
                const options = indexOptions[collection] ? indexOptions[collection][i] : {};

                // Vérifier si l'index existe déjà pour éviter les conflits
                const existingIndexes = await db.collection(collection).indexes();
                const indexName = Object.keys(index)[0] + "_1"; // Exemple: "email_1"

                if (!existingIndexes.some(idx => idx.name === indexName)) {
                    await db.collection(collection).createIndex(index, options);
                    console.log(`🔍 Index ajouté pour ${collection}:`, index, options);
                } else {
                    console.log(`✅ Index déjà existant pour ${collection}:`, index);
                }
            }
        }

        console.log("🎉 La base de données est prête !");
        mongoose.connection.close();
    } catch (error) {
        console.error("❌ Erreur lors de la configuration de la base :", error);
        mongoose.connection.close();
    }
}

setupDatabase();