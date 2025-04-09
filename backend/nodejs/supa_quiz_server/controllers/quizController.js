const Quiz = require("../models/quizModel");
const crypto = require("crypto");

exports.createQuiz = async (req, res) => {
    try {
        const { title, theme, difficulty, questions } = req.body;

        // ✅ Calcul automatique du nombre de questions
        const question_count = questions?.length || 0;

        const newQuiz = new Quiz({
            quiz_id: crypto.randomUUID(),
            title,
            theme,
            difficulty,
            question_count
        });

        await newQuiz.save();
        res.status(201).json({ message: "Quiz créé avec succès", quiz: newQuiz });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};

exports.getAllQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find();
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};

exports.getQuizById = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz non trouvé" });
        }
        res.status(200).json(quiz);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

exports.updateQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findByIdAndUpdate(req.params.quizId, req.body, { new: true, runValidators: true });

        if (!quiz) {
            return res.status(404).json({ message: "Quiz non trouvé" });
        }

        res.status(200).json(quiz);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

exports.deleteQuiz = async (req, res) => {
    try {
        console.log("🗑 Suppression du quiz ID :", req.params.quizId);
        const quiz = await Quiz.findByIdAndDelete(req.params.quizId);

        if (!quiz) {
            return res.status(404).json({ message: "Quiz non trouvé" });
        }

        res.status(200).json({ message: "Quiz supprimé avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};
