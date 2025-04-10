const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // ✅ Import UUID
const Question = require("../models/questionModel");
const Quiz = require("../models/quizModel");

// ✅ Récupérer toutes les questions
exports.getAllQuestions = async (req, res) => {
    try {
        const questions = await Question.find();
        res.status(200).json({ success: true, questions });
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des questions :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ✅ Récupérer une question par ID
exports.getQuestionById = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: "Question non trouvée" });
        }
        res.status(200).json({ success: true, question });
    } catch (error) {
        console.error("❌ Erreur lors de la récupération de la question :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ✅ Récupérer des questions par thème
exports.getQuestionsByTheme = async (req, res) => {
    try {
        const { theme } = req.params;
        const questions = await Question.find({ theme });
        if (questions.length === 0) {
            return res.status(404).json({ success: false, message: "Aucune question trouvée pour ce thème" });
        }
        res.status(200).json({ success: true, questions });
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des questions par thème :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

exports.createQuestion = async (req, res) => {
    try {
        const { quiz_id, question_text, answer_options, correct_answer, difficulty, theme } = req.body;

        console.log("🔍 quiz_id reçu :", quiz_id);

        if (!quiz_id) {
            return res.status(400).json({ message: "L'ID du quiz est requis." });
        }

        const newQuestion = new Question({
            question_id: new mongoose.Types.ObjectId().toString(),  // ✅ Génère un ID unique
            quiz_id,
            question_text,
            answer_options,
            correct_answer,
            difficulty,
            theme
        });        
        
        await newQuestion.save();
        console.log("✅ Question ajoutée :", newQuestion);

        // 🔄 Mettre à jour le `question_count` du quiz
        const updatedQuiz = await Quiz.findOneAndUpdate(
            { quiz_id: String(quiz_id) },  
            { $inc: { question_count: 1 } },
            { new: true }
        );        

        if (!updatedQuiz) {
            console.warn("⚠️ Quiz non trouvé, question ajoutée mais question_count non mis à jour.");
            return res.status(404).json({ success: false, message: "Quiz non trouvé" });
        }

        console.log("🔄 Nombre de questions mis à jour :", updatedQuiz.question_count);

        res.status(201).json({
            message: "Question ajoutée avec succès",
            question: newQuestion,
            updatedQuiz
        });
    } catch (error) {
        console.error("❌ Erreur lors de la création de la question :", error);
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

// ✅ Mettre à jour une question
exports.updateQuestion = async (req, res) => {
    try {
        const updatedQuestion = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedQuestion) {
            return res.status(404).json({ success: false, message: "Question non trouvée" });
        }
        res.status(200).json({ success: true, message: "Question mise à jour", question: updatedQuestion });
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour de la question :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ✅ Supprimer une question
exports.deleteQuestion = async (req, res) => {
    try {
        const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
        if (!deletedQuestion) {
            return res.status(404).json({ success: false, message: "Question non trouvée" });
        }
        res.status(200).json({ success: true, message: "Question supprimée avec succès" });
    } catch (error) {
        console.error("❌ Erreur lors de la suppression de la question :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};
