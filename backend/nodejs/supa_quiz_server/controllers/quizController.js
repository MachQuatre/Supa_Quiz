const Quiz = require("../models/quizModel");
const Question = require("../models/questionModel");
const crypto = require("crypto");

exports.createQuiz = async (req, res) => {
    try {
        const { title, theme, difficulty, questions } = req.body;
        const question_count = questions?.length || 0;

        const newQuiz = new Quiz({
            quiz_id: crypto.randomUUID(),
            title,
            theme,
            difficulty,
            question_count,
            created_by: req.user.user_id,
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
        const quiz = await Quiz.findOne({ quiz_id: req.params.quizId });
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
        const quiz = await Quiz.findOneAndUpdate({ quiz_id: req.params.quizId }, req.body, {
            new: true,
            runValidators: true,
        });

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
        const quiz = await Quiz.findOneAndDelete({ quiz_id: req.params.quizId });

        if (!quiz) {
            return res.status(404).json({ message: "Quiz non trouvé" });
        }

        await Question.deleteMany({ quiz_id: req.params.quizId });

        res.status(200).json({ message: "Quiz et questions supprimés avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

exports.getMyQuizzes = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const myQuizzes = await Quiz.find({ created_by: userId });
        res.status(200).json(myQuizzes);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des quiz de l'utilisateur :", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};

exports.getQuizQuestions = async (req, res) => {
    try {
        const quizUuid = req.params.quizId;
        const quiz = await Quiz.findOne({ quiz_id: quizUuid });
        if (!quiz) {
            return res.status(404).json({ message: "Quiz non trouvé" });
        }

        const questions = await Question.find({ quiz_id: quizUuid });
        res.status(200).json({ quiz_id: quizUuid, questions });
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des questions :", error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

exports.deleteQuizQuestion = async (req, res) => {
    try {
        const { quizId, questionId } = req.params;

        // Recherche soit par _id MongoDB soit par question_id
        const question = await Question.findOne({
            $or: [{ _id: questionId }, { question_id: questionId }],
            quiz_id: quizId
        });

        if (!question) {
            return res.status(404).json({ message: "Question non trouvée pour ce quiz" });
        }

        await Question.deleteOne({ _id: question._id });

        // Décrémenter le compteur de questions dans le quiz
        await Quiz.updateOne({ quiz_id: quizId }, { $inc: { question_count: -1 } });

        res.status(200).json({ message: "Question supprimée avec succès" });
    } catch (error) {
        console.error("❌ Erreur suppression question :", error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};
