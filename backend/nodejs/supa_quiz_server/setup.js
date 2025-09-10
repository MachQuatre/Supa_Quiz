require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const User = require("./models/userModel");

const DB_NAME = process.env.MONGO_DB  || "quiz_app";
const mongoURI = process.env.MONGO_URI || `mongodb://localhost:27017/${DB_NAME}`;

// ✅ Toutes les collections en minuscule
const collections = [
    "users",
    "quizzes",
    "questions",
    "sessions",
    "responses",
    "gamesessions",      // ✅ nouvelle collection
    "usersessions"       // ✅ nouvelle collection
];

// ✅ Les indexes aussi doivent être en minuscule
const indexes = {
    users: [{ email: 1 }],
    sessions: [{ user_id: 1 }, { questionnaire_id: 1 }],
    responses: [{ session_id: 1 }, { user_id: 1 }],
    gamesessions: [{ session_id: 1 }],
    usersessions: [{ user_session_id: 1 }, { user_id: 1 }]
};

const indexOptions = {
    users: [{ unique: true }],
    gamesessions: [{ unique: true }],
    usersessions: [{ unique: true }, {}]
};

async function setupDatabase() {
    try {
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

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
                const options = indexOptions[collection]?.[i] || {};

                const existingIndexes = await db.collection(collection).indexes();
                const indexName = Object.keys(index)[0] + "_1";

                if (!existingIndexes.some(idx => idx.name === indexName)) {
                    await db.collection(collection).createIndex(index, options);
                    console.log(`🔍 Index ajouté pour ${collection}:`, index, options);
                } else {
                    console.log(`✅ Index déjà existant pour ${collection}:`, index);
                }
            }
        }

        const existingAdmin = await db.collection("users").findOne({ email: "admin@supaquiz.com" });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            await db.collection("users").insertOne({
                user_id: uuidv4(),
                username: "admin",
                email: "admin@supaquiz.com",
                password: hashedPassword,
                role: "admin",
                score_total: 0,
                avatar_choisi: "assets/avatars/avatar1.png",
                achievement_state: "aucun"
            });
            console.log("✅ Super Admin créé : admin@supaquiz.com / admin123");
        } else {
            console.log("🔐 Super Admin déjà existant.");
        }

        console.log("🎉 La base de données est prête !");
        mongoose.connection.close();
    } catch (error) {
        console.error("❌ Erreur lors de la configuration de la base :", error);
        mongoose.connection.close();
    }
}

setupDatabase();
