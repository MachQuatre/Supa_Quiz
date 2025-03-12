const Session = require("../models/sessionModel");
const Questionnaire = require("../models/QuestionnaireModel");

// 🔹 Fonction générique pour récupérer un classement avec possibilité de filtrer par catégorie
const getLeaderboard = async (filter = {}) => {
    console.log("🟡 getLeaderboard - Filtre reçu :", filter);
    
    const results = await Session.aggregate([
        { $match: filter },
        {
            $group: {
                _id: "$user_id",
                totalScore: { $sum: "$score" },
                avgCompletion: { $avg: "$completion_percentage" }
            }
        },
        { $sort: { totalScore: -1 } }
    ]);

    console.log("🟢 Résultats agrégés :", results);
    return results;
};

// 🔹 Classement Général
exports.getGeneralLeaderboard = async (req, res) => {
    try {
        const { userId } = req.query;
        console.log("🟡 Paramètre userId :", userId);

        const leaderboard = await getLeaderboard();
        console.log("🟢 Classement général :", leaderboard);

        const top10 = leaderboard.slice(0, 10);
        console.log("🟢 Top 10 général :", top10);

        let userRank = null;
        let userScore = null;

        if (userId) {
            const userIndex = leaderboard.findIndex(entry => entry._id === userId);
            console.log("🟢 Index utilisateur :", userIndex);

            if (userIndex !== -1) {
                userRank = userIndex + 1;
                userScore = leaderboard[userIndex].totalScore;
            }
        }

        res.status(200).json({
            success: true,
            top10,
            userRank,
            userScore
        });
    } catch (error) {
        console.error("🔴 Erreur dans getGeneralLeaderboard :", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 🔹 Classement par catégorie
exports.getCategoryLeaderboard = async (req, res) => {
    try {
        const { categoryName } = req.params;
        const { userId } = req.query;

        console.log("🟡 Catégorie reçue :", categoryName);
        console.log("🟡 Paramètre userId :", userId);

        // 🔍 Récupération des questionnaires de la catégorie
        const questionnaires = await Questionnaire.find({ theme: categoryName });
        console.log("🟢 Questionnaires trouvés :", questionnaires);

        if (questionnaires.length === 0) {
            console.log("🔴 Aucun questionnaire trouvé pour la catégorie :", categoryName);
            return res.status(404).json({ success: false, message: "Aucun questionnaire trouvé pour cette catégorie." });
        }

        const questionnaireIds = questionnaires.map(q => q.questionnaire_id);
        console.log("🟢 ID des questionnaires trouvés :", questionnaireIds);

        // 🔍 Récupération des scores des utilisateurs sur ces questionnaires
        const leaderboard = await Session.aggregate([
            { $match: { questionnaire_id: { $in: questionnaireIds } } },
            {
                $group: {
                    _id: "$user_id",
                    totalScore: { $sum: "$score" },
                    avgCompletion: { $avg: "$completion_percentage" }
                }
            },
            { $sort: { totalScore: -1 } }
        ]);

        console.log("🟢 Classement par catégorie :", leaderboard);

        if (leaderboard.length === 0) {
            console.log("🔴 Aucun score trouvé pour la catégorie :", categoryName);
            return res.status(404).json({ success: false, message: "Aucun score trouvé pour cette catégorie." });
        }

        const top10 = leaderboard.slice(0, 10);
        console.log("🟢 Top 10 de la catégorie :", top10);

        let userRank = null;
        let userScore = null;

        if (userId) {
            const userIndex = leaderboard.findIndex(entry => entry._id === userId);
            console.log("🟢 Index utilisateur :", userIndex);

            if (userIndex !== -1) {
                userRank = userIndex + 1;
                userScore = leaderboard[userIndex].totalScore;
            }
        }

        console.log("🟡 Rang utilisateur dans la catégorie :", userRank, " | Score utilisateur :", userScore);

        res.status(200).json({
            success: true,
            category: categoryName,
            top10,
            userRank,
            userScore
        });
    } catch (error) {
        console.error("🔴 Erreur dans getCategoryLeaderboard :", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
