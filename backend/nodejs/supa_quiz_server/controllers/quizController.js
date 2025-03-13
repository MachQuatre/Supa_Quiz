const Quiz = require("../models/quizModel");
const crypto = require("crypto");

exports.createQuiz = async (req, res) => {
    try {
        const { title, theme, difficulty, question_count } = req.body;
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