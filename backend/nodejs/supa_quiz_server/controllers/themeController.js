// controllers/themeController.js
const Question = require("../models/questionModel");

// Liste brute de thèmes (tous, sans seuil)
async function getThemes(req, res) {
  try {
    const themes = await Question.distinct("theme");
    const list = (themes || [])
      .map((t) => String(t || "").trim())
      .filter((t) => t.length > 0)
      .sort((a, b) => a.localeCompare(b, "fr"));

    // format homogène
    res.json({ themes: list.map((name) => ({ _id: name, name, isActive: true })) });
  } catch (e) {
    console.error("❌ getThemes error:", e);
    res.status(500).json({ error: "Failed to list themes" });
  }
}

// Thèmes avec au moins `min` questions (par défaut 5)
async function getAvailableThemes(req, res) {
  try {
    const min = Math.max(1, Number(req.query.min || 5));

    const rows = await Question.aggregate([
      { $match: { theme: { $exists: true, $ne: null, $ne: "" } } },
      { $group: { _id: "$theme", count: { $sum: 1 } } },
      { $match: { count: { $gte: min } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: "$_id", count: 1 } }, // -> { name, count }
    ]).collation({ locale: "fr", strength: 1 });

    // Si ton front veut aussi un _id = name :
    const themes = rows.map(r => ({ _id: r.name, name: r.name, count: r.count }));

    return res.status(200).json({ min, themes });
  } catch (e) {
    console.error("❌ getAvailableThemes error:", e);
    return res.status(500).json({ message: "Erreur récupération thèmes" });
  }
}

module.exports = { getThemes, getAvailableThemes };
