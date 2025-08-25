const Question = require("../models/questionModel");
const Quiz = require("../models/quizModel");
const crypto = require("crypto");

exports.importQuestionnaire = async (req, res) => {
  try {
    const { quiz_id, title, theme, difficulty, questions } = req.body;

    if (!quiz_id || !title || !theme || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        error: "quiz_id, title, theme et une liste de questions sont requis."
      });
    }

    // 1. Vérifie que le quiz existe
    const quiz = await Quiz.findOne({ quiz_id });
    if (!quiz) {
      return res.status(404).json({ error: "Quiz non trouvé avec ce quiz_id." });
    }

    // 2. Met à jour les métadonnées du quiz
    quiz.title = title;
    quiz.theme = theme;
    if (difficulty) quiz.difficulty = difficulty;
    quiz.question_count += questions.length;

    await quiz.save();

    // 3. Ajout des questions
    for (const q of questions) {
      if (!q.content || !Array.isArray(q.options) || typeof q.answer !== "number" || !q.theme) {
        throw new Error("Chaque question doit contenir content, options, answer et theme.");
      }

      const question = new Question({
        question_id: crypto.randomUUID(),
        quiz_id,
        question_text: q.content,
        answer_options: q.options,
        correct_answer: String.fromCharCode(65 + q.answer), // convertit 0 → 'A', 1 → 'B', ...
        theme: q.theme,
        difficulty: q.difficulty || "moyen"
      });
      
      await question.save();
    }

    res.status(201).json({
      message: `✅ ${questions.length} question(s) ajoutée(s) au quiz ${quiz_id} (titre mis à jour : ${title})`
    });
  } catch (err) {
    console.error("❌ Erreur lors de l'import :", err.message);
    res.status(500).json({ error: err.message || "Erreur serveur" });
  }
};
