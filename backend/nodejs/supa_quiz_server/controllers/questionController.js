const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // ✅ Import UUID (conservé)
const Question = require("../models/questionModel");
const Quiz = require("../models/quizModel");

// ------------------------- helpers -------------------------
function isObjectId(v) {
  return mongoose.isValidObjectId(v);
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

// Plie en ASCII, retire diacritiques, puis sécurise (remplace caractères non alphanum par _)
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

// Fabrique des variantes raisonnables pour matcher la DB
function candidatesFor(id) {
  const raw = (id ?? "").toString();
  const ascii = asciiFold(raw);
  const lower = raw.toLowerCase();
  const asciiLower = ascii.toLowerCase();
  const noSpace = raw.replace(/\s+/g, "_");
  const asciiNoSpace = ascii.replace(/\s+/g, "_");
  return uniq([raw, ascii, lower, asciiLower, noSpace, asciiNoSpace]);
}

// Convertit A/B/C/D -> 0/1/2/3
function letterToIndex(ch) {
  const map = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
  return Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : null;
}

// Helpers pour lire label / id d'une réponse (string ou objet)
function getLabel(v, i) {
  if (typeof v === "string") return v;
  return v?.text ?? v?.label ?? v?.answer ?? v?.value ?? `Réponse ${i + 1}`;
}
function getId(v, i) {
  if (typeof v === "string") return v;
  return v?.id ?? v?._id ?? v?.value ?? getLabel(v, i);
}

// Normalisation robuste pour coller au front "Entraînement IA"
function normalizeQuestion(doc) {
  const q = doc && typeof doc.toObject === "function" ? doc.toObject() : (doc || {});

  // Texte de la question
  const text =
    q.question_text ??
    q.text ??
    q.question ??
    q.label ??
    q.title ??
    "Question";

  // Réponses (on accepte strings ou objets)
  let answers =
    q.answer_options ??
    q.answers ??
    q.options ??
    q.choices ??
    [];
  if (!Array.isArray(answers)) answers = [];

  // Identifiant / info "réponse correcte" — peut être lettre, index, id, label, objet...
  let correctIdRaw =
    q.correct_answer ??
    q.correct_id ??
    q.correctAnswerId ??
    q.correctId ??
    q.correct_index ??
    q.correct ??
    null;

  // Objectif : produire un index numérique (0..answers.length-1) dans correct_id
  let correctIndex = null;

  try {
    if (typeof correctIdRaw === "number") {
      // déjà un index
      correctIndex = Number.isInteger(correctIdRaw) ? correctIdRaw : null;
    } else if (typeof correctIdRaw === "string") {
      // lettre A/B/C/D ?
      const li = letterToIndex(correctIdRaw.trim());
      if (li !== null) {
        correctIndex = li;
      } else {
        // essayer de retrouver l’index par égalité sur id/label
        const s = correctIdRaw.toString();
        for (let i = 0; i < answers.length; i++) {
          const lbl = getLabel(answers[i], i).toString();
          const id = getId(answers[i], i).toString();
          if (lbl === s || id === s) { correctIndex = i; break; }
        }
      }
    } else if (correctIdRaw && typeof correctIdRaw === "object") {
      // si on nous a donné un objet, on tente sur id/label
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
        for (let i = 0; i < answers.length; i++) {
          const lbl = getLabel(answers[i], i).toString();
          const id = getId(answers[i], i).toString();
          if (lbl === ss || id === ss) { correctIndex = i; break; }
        }
      }
    }

    // Si on a un index mais hors bornes, on invalide
    if (typeof correctIndex === "number") {
      if (correctIndex < 0 || correctIndex >= answers.length) correctIndex = null;
    }
  } catch (_) {
    correctIndex = null;
  }

  return {
    ...q,
    text,
    answers,
    // ⚠️ C'est ce champ que lit en priorité le front d'entraînement
    correct_id: correctIndex,
  };
}

// ------------------------- controllers -------------------------

// ✅ Récupérer toutes les questions (format brut pour compatibilité admin)
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des questions :", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// ✅ Récupérer une question par ID (ObjectId OU code métier)
// ⚠️ Renvoie l'objet question normalisé directement (pas { success, question })
exports.getQuestionById = async (req, res) => {
  try {
    const rawId = req.params.id; // Express a déjà décodé %xx
    const cands = candidatesFor(rawId);

    console.log(`[questions] lookup id="${rawId}" candidates=${JSON.stringify(cands)}`);

    let question = null;

    // 1) _id Mongo
    if (isObjectId(rawId)) {
      question = await Question.findById(rawId).lean();
    }

    // 2) Par champs "code" applicatifs (tolérant aux variantes)
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

// ✅ Récupérer des questions par thème (format brut pour compat)
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
      question_id: new mongoose.Types.ObjectId().toString(), // ✅ Génère un ID applicatif
      quiz_id,
      question_text,
      answer_options,
      correct_answer,
      difficulty,
      theme,
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
      updatedQuiz,
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
