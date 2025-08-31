const Questionnaire = require("../models/questionnaireModel");
const Question = require("../models/questionModel");

function letterToIndex(letter) {
  const m = { A:0, B:1, C:2, D:3 };
  return m[String(letter || "").toUpperCase()] ?? -1;
}
function nowStamp() {
  const d = new Date(), p = (n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
}
function rand(n=3){const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<n;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}

async function createQuestionnaire(req, res) {
  try {
    const theme = (req.body.themeId || req.body.theme || "").trim();
    if (!theme) return res.status(400).json({ error: "theme (ou themeId) requis" });

    // 5 questions aléatoires du thème
    const qs = await Question.aggregate([{ $match: { theme } }, { $sample: { size: 5 } }]);
    if (!qs || qs.length < 5) return res.status(400).json({ error: "Pas assez de questions pour ce thème (min 5)" });

    const name = `Quiz-${theme}-${nowStamp()}-${rand()}`;
    const snapshot = qs.map((q) => ({
      question_id: q.question_id || String(q._id || ""),
      text: q.question_text,
      options: q.answer_options,
      correctIndex: letterToIndex(q.correct_answer),
    }));

    const doc = await Questionnaire.create({ name, theme, snapshot });
    res.json({
      questionnaireId: String(doc._id),
      name: doc.name,
      theme: doc.theme,
      questions: doc.snapshot.map((s, i) => ({ index:i, text:s.text, options:s.options, correctIndex:s.correctIndex })),
    });
  } catch (e) {
    console.error("❌ createQuestionnaire error:", e);
    res.status(500).json({ error: "Erreur lors de la création du questionnaire" });
  }
}

module.exports = { createQuestionnaire };
