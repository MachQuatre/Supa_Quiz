const Question = require("../models/questionModel");

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

// ✅ Ajouter une nouvelle question
exports.createQuestion = async (req, res) => {
    try {
        const { question_text, correct_answer, answer_options, difficulty, theme } = req.body;

        if (!question_text || !correct_answer || !answer_options || !theme) {
            return res.status(400).json({ success: false, message: "Tous les champs sont requis" });
        }

        const newQuestion = new Question({ question_text, correct_answer, answer_options, difficulty, theme });
        await newQuestion.save();

        res.status(201).json({ success: true, message: "Question créée avec succès", question: newQuestion });
    } catch (error) {
        console.error("❌ Erreur lors de la création de la question :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
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
