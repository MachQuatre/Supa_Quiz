const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // conservé (utile ailleurs)
const Question = require("../models/questionModel");
const Quiz = require("../models/quizModel");

// ------------------------- helpers -------------------------
function isObjectId(v) {
  return mongoose.isValidObjectId(v);
}
function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}
function asciiFold(s) {
  try {
    return String(s)
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^\w-]/g, "_");
  } catch {
    return s;
  }
}
function candidatesFor(id) {
  const raw = (id ?? "").toString();
  const ascii = asciiFold(raw);
  const lower = raw.toLowerCase();
  const asciiLower = ascii.toLowerCase();
  const noSpace = raw.replace(/\s+/g, "_");
  const asciiNoSpace = ascii.replace(/\s+/g, "_");
  return uniq([raw, ascii, lower, asciiLower, noSpace, asciiNoSpace]);
}
function letterToIndex(ch) {
  const map = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
  return Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : null;
}
function getLabel(v, i) {
  if (typeof v === "string") return v;
  return v?.text ?? v?.label ?? v?.answer ?? v?.value ?? `Réponse ${i + 1}`;
}
function getId(v, i) {
  if (typeof v === "string") return v;
  return v?.id ?? v?._id ?? v?.value ?? getLabel(v, i);
}

// ------------------------- normalisation (clé) -------------------------
function normalizeQuestion(doc) {
  const q = doc && typeof doc.toObject === "function" ? doc.toObject() : (doc || {});

  const text =
    q.question_text ??
    q.text ??
    q.question ??
    q.label ??
    q.title ??
    "Question";

  // 1) réponses -> tableau de libellés (strings)
  let answersRaw =
    q.answer_options ??
    q.answers ??
    q.options ??
    q.choices ??
    [];
  if (!Array.isArray(answersRaw)) answersRaw = [];

  const answers = answersRaw.map((v, i) => getLabel(v, i).toString());

  // 2) déterminer l'index correct (0..n-1) à partir de n'importe quel format en base
  let correctIdRaw =
    q.correct_answer ??
    q.correct_id ??
    q.correctAnswerId ??
    q.correctId ??
    q.correct_index ??
    q.correct ??
    null;

  let correctIndex = null;
  try {
    if (typeof correctIdRaw === "number") {
      correctIndex = Number.isInteger(correctIdRaw) ? correctIdRaw : null;
    } else if (typeof correctIdRaw === "string") {
      // lettre A/B/C/D ?
      const li = letterToIndex(correctIdRaw.trim());
      if (li !== null) {
        correctIndex = li;
      } else {
        // essayer de matcher par libellé/ID
        const s = correctIdRaw.toString();
        for (let i = 0; i < answersRaw.length; i++) {
          const lbl = getLabel(answersRaw[i], i).toString();
          const id = getId(answersRaw[i], i).toString();
          if (lbl === s || id === s) { correctIndex = i; break; }
        }
      }
    } else if (correctIdRaw && typeof correctIdRaw === "object") {
      const s =
        correctIdRaw.id ??
        correctIdRaw._id ??
        correctIdRaw.value ??
        correctIdRaw.text ??
        correctIdRaw.label ??
        correctIdRaw.answer ??
        null;
      if (s != null) {
        const ss = s.toString();
        for (let i = 0; i < answersRaw.length; i++) {
          const lbl = getLabel(answersRaw[i], i).toString();
          const id = getId(answersRaw[i], i).toString();
          if (lbl === ss || id === ss) { correctIndex = i; break; }
        }
      }
    }

    if (typeof correctIndex === "number") {
      if (correctIndex < 0 || correctIndex >= answers.length) correctIndex = null;
    }
  } catch (_) {
    correctIndex = null;
  }

  // 3) dérivés compatibles (index, lettre, libellé) + alias de champs
  const letters = ["A", "B", "C", "D"];
  const correct_letter = (typeof correctIndex === "number" && correctIndex >= 0 && correctIndex < letters.length)
    ? letters[correctIndex]
    : null;

  const correct_label = (typeof correctIndex === "number" && answers[correctIndex] != null)
    ? answers[correctIndex]
    : (typeof correctIdRaw === "string" ? correctIdRaw : null);

  return {
    ...q,

    // champs normalisés (nouveaux)
    text,
    answers,                         // tableau de strings (ordre stable)
    correct_id: correctIndex,        // INDEX numérique attendu par l'écran d'entraînement
    correct_letter,                  // lettre équivalente (A/B/C/D)
    correct_label,                   // libellé équivalent (ex: "JavaScript")
    letters: letters.slice(0, answers.length),

    // alias pour compatibilité descendante (le front peut lire ce qu'il veut)
    answer_options: answers,
    options: answers,
    choices: answers,
    correct_index: correctIndex,
    correctIndex: correctIndex,
    correct: correctIndex,
    correct_answer: correct_label,   // texte (utile si le front compare des strings)
  };
}

// ------------------------- controllers -------------------------

// Liste brute (compat admin)
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des questions :", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Détail normalisé (utilisé par l'entraînement IA)
exports.getQuestionById = async (req, res) => {
  try {
    const rawId = req.params.id;
    const cands = candidatesFor(rawId);
    console.log(`[questions] lookup id="${rawId}" candidates=${JSON.stringify(cands)}`);

    let question = null;
    if (isObjectId(rawId)) {
      question = await Question.findById(rawId).lean();
    }
    if (!question) {
      question = await Question.findOne({
        $or: [
          { code: { $in: cands } },
          { question_id: { $in: cands } },
          { slug: { $in: cands } },
          { ref: { $in: cands } },
          { externalId: { $in: cands } },
          { name: { $in: cands } },
          { question_code: { $in: cands } },
        ],
      }).lean();
    }

    if (!question) {
      return res.status(404).json({ success: false, message: "Question non trouvée" });
    }

    const normalized = normalizeQuestion(question);
    return res.status(200).json(normalized);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la question :", error);
    return res
      .status(500)
      .json({ success: false, message: "Erreur serveur", details: String(error.message || error) });
  }
};

// Par thème (brut)
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
    if (!quiz_id) return res.status(400).json({ message: "L'ID du quiz est requis." });

    const newQuestion = new Question({
      question_id: new mongoose.Types.ObjectId().toString(),
      quiz_id,
      question_text,
      answer_options,
      correct_answer,
      difficulty,
      theme,
    });

    await newQuestion.save();
    console.log("✅ Question ajoutée :", newQuestion);

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
      updatedQuiz,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la création de la question :", error);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

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

// (optionnel) export de la normalisation si tu veux la réutiliser ailleurs (AI, etc.)
module.exports.__normalizeQuestion = normalizeQuestion;
