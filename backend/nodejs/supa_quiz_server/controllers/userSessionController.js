const axios = require("axios");
const mongoose = require("mongoose"); // ⬅️ pour accès direct à la collection
const { checkAndAssignBadges } = require("../utils/badgeChecker");
const UserBadge = require("../models/userBadgeModel");
const Quiz = require("../models/quizModel");
const UserSession = require("../models/userSessionModel");
const User = require("../models/userModel");
const { v4: uuidv4 } = require("uuid");
const UUIDv4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const {
  addSessionScoreAndUnlock,
  recomputeTotalAndUnlock,
} = require("../utils/scoreAchievements.service");

/* ---------------------- IA client (préwarm) ---------------------- */
const PY_AI_URL = process.env.PY_AI_URL || "http://ai_service:5001";
const AI_SHARED_SECRET = process.env.AI_SHARED_SECRET || "";
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 8000);

const httpAI = axios.create({
  baseURL: PY_AI_URL,
  timeout: AI_TIMEOUT_MS,
});
httpAI.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (AI_SHARED_SECRET) config.headers["X-AI-Token"] = AI_SHARED_SECRET;
  return config;
});

/** fire-and-forget: préchauffe les recos IA pour un utilisateur */
function prewarmRecommendations(userId, { limit = 20, policy = "dkt", mix_ratio = 0.5 } = {}) {
  if (!userId) return;
  httpAI
    .get("/recommendations", { params: { user_id: String(userId), limit, policy, mix_ratio } })
    .catch(() => {}); // silencieux: ne bloque jamais le flux utilisateur
}

/* ---------------------- helpers locaux ---------------------- */
const pick = (obj, ...keys) => {
  for (const k of keys) if (obj && obj[k] !== undefined) return obj[k];
  return undefined;
};
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return ["true", "1", "yes", "ok", "correct", "vrai"].includes(s);
  }
  return false;
};

/* ---------------------- Créer une UserSession ---------------------- */
async function createUserSession(req, res) {
  try {
    // source de vérité: users.user_id
    const rawUserId =
      (req.user && (req.user.user_id || req.user.id)) || req.body.user_id;

    if (!rawUserId || !UUIDv4.test(String(rawUserId))) {
      return res.status(400).json({ message: "user_id (UUID) requis" });
    }

    const { game_session_id, quiz_id, theme } = req.body;
    if (!game_session_id || !quiz_id) {
      return res.status(400).json({ message: "game_session_id et quiz_id requis" });
    }

    const session = new UserSession({
      user_session_id: uuidv4(),   // ✅ reste un UUID public
      user_id: String(rawUserId),  // ✅ toujours l'UUID users.user_id
      game_session_id,
      quiz_id,
      theme,
    });

    await session.save();

    // préchauffe les recos pour l'utilisateur
    prewarmRecommendations(session.user_id);

    return res.status(201).json({ message: "UserSession démarrée", session });
  } catch (e) {
    console.error("createUserSession error:", e);
    return res.status(500).json({ message: "Erreur création UserSession" });
  }
}

/* ---------------------- Mettre à jour une UserSession ---------------------- */
async function updateUserSession(req, res) {
  try {
    const { user_session_id } = req.params;
    const { questions_played, score, completion_percentage, end_time } = req.body;

    const safeScoreRaw = Number.isFinite(score) ? score : Number(score);
    const safeScore = Number.isFinite(safeScoreRaw) ? safeScoreRaw : 0;

    const updateDoc = {
      score: safeScore,
      end_time: end_time ? new Date(end_time) : new Date(),
    };
    if (Array.isArray(questions_played)) updateDoc.questions_played = questions_played;
    if (completion_percentage !== undefined && completion_percentage !== null) {
      updateDoc.completion_percentage = completion_percentage;
    }

    const updated = await UserSession.findOneAndUpdate(
      { user_session_id },                      // ✅ clé correcte
      { $set: updateDoc },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "UserSession non trouvée" });

    const playedList = Array.isArray(questions_played)
      ? questions_played
      : Array.isArray(updated.questions_played)
      ? updated.questions_played
      : [];
    const totalPossible = playedList.length * 10;
    const percentScore = totalPossible > 0 ? Math.round((safeScore / totalPossible) * 100) : 0;

    const assignedBadges = await checkAndAssignBadges(
      { user_id: updated.user_id, score_percent: percentScore, theme: updated.theme || null },
      { UserBadge, Quiz }
    );

    // préchauffe les recos (après mise à jour)
    prewarmRecommendations(updated.user_id);

    return res.status(200).json({
      message: "UserSession mise à jour",
      session: updated,
      user_total_score: undefined,   // pas calculé ici
      score_percent: percentScore,
      badges_awarded: assignedBadges,
    });
  } catch (error) {
    console.error("Erreur updateUserSession:", error);
    return res.status(500).json({ message: "Erreur mise à jour", error });
  }
}

/* ---------------------- Lister les sessions d’un utilisateur ---------------------- */
async function getUserSessions(req, res) {
  try {
    const { user_id } = req.params;
    const { limit } = req.query; // ex: /user/:user_id?limit=100

    const sessions = await UserSession.find({ user_id })
      .sort({ end_time: -1, start_time: -1 })
      .limit(Math.min(parseInt(limit || "500", 10), 500));

    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération sessions", error });
  }
}

/* ---------------------- Enregistrer une réponse (mode GameSession) ---------------------- */
async function submitAnswer(req, res) {
  try {
    const { user_session_id } = req.params;
    const { question_id, is_correct, response_time_ms } = req.body;

    const session = await UserSession.findOne({ user_session_id });
    if (!session) {
      return res.status(404).json({ message: "UserSession introuvable" });
    }

    session.questions_played.push({
      question_id,
      answered: true,
      is_correct,
      response_time_ms,
    });

    if (is_correct) session.score += 10;

    const totalAnswered = session.questions_played.length;
    session.completion_percentage = totalAnswered * 10; // 10 questions => 100%

    await session.save();

    // préchauffe les recos immédiatement après la réponse
    prewarmRecommendations(session.user_id);

    res.status(200).json({
      message: "✅ Réponse enregistrée",
      score: session.score,
      completion: session.completion_percentage,
      session,
    });
  } catch (error) {
    console.error("❌ Erreur dans submitAnswer :", error);
    res.status(500).json({ message: "Erreur soumission réponse", error });
  }
}

/* ---------------------- Enregistrer le résumé de fin de session ---------------------- */
async function submitSessionSummary(req, res) {
  try {
    const { user_session_id } = req.params;
    const { questions_played, score, completion_percentage } = req.body || {};

    const session = await UserSession.findOne({ user_session_id }); // ✅ clé correcte
    if (!session) {
      return res.status(404).json({ message: "Session non trouvée" });
    }

    const s = toNum(score);
    const cp = toNum(completion_percentage);

    // Mise à jour de la session
    session.questions_played = (Array.isArray(questions_played) ? questions_played : []).map((q) => ({
      ...q,
      answered: true,
    }));
    if (s !== null) session.score = s;
    if (cp !== null) session.completion_percentage = Math.max(0, Math.min(100, cp));
    session.end_time = new Date();
    session.status = "ended";
    await session.save();

    // Recompute total (idempotent)
    const { total, newlyUnlocked } = await recomputeTotalAndUnlock(session.user_id);

    // préchauffe les recos pour la prochaine session
    prewarmRecommendations(session.user_id);

    return res.status(200).json({
      message: "✅ Résumé de session enregistré",
      session,
      user_total_score: total,
      unlocked: newlyUnlocked,
    });
  } catch (error) {
    console.error("submitSessionSummary error:", error);
    return res.status(500).json({
      message: "Erreur enregistrement résumé session",
      error: error.message || error,
    });
  }
}

/* ---------------------- Résumé profil : 10 dernières + totaux ---------------------- */
async function getMySummary(req, res) {
  try {
    const userId =
      (req.user && (req.user.id || req.user._id)) ||
      req.query.user_id ||
      req.params.user_id;

    if (!userId) {
      return res.status(400).json({ message: "user_id manquant (auth ou query param)" });
    }

    const recentAgg = await UserSession.aggregate([
      { $match: { user_id: String(userId) } },
      { $addFields: { _date: { $ifNull: ["$end_time", "$start_time"] } } },
      { $sort: { _date: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "quizzes",
          let: { qidStr: "$quiz_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$quiz_id", "$$qidStr"] },
                    {
                      $eq: [
                        "$_id",
                        {
                          $convert: {
                            input: "$$qidStr",
                            to: "objectId",
                            onError: null,
                            onNull: null,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            { $project: { title: 1, name: 1 } },
          ],
          as: "quizDoc",
        },
      },
      { $unwind: { path: "$quizDoc", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "gamesessions",
          localField: "game_session_id",
          foreignField: "session_id",
          as: "gameDoc",
        },
      },
      { $unwind: { path: "$gameDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          user_session_id: 1,
          score: 1,
          date: "$_date",
          quizTitle: { $ifNull: ["$quizDoc.title", { $ifNull: ["$quizDoc.name", "Quiz"] }] },
          gameCode: { $ifNull: ["$gameDoc.session_id", null] },
        },
      },
    ]);

    const totalsAgg = await UserSession.aggregate([
      { $match: { user_id: String(userId) } },
      { $group: { _id: null, totalScore: { $sum: "$score" }, totalGames: { $sum: 1 } } },
    ]);
    const totals = totalsAgg[0] || { totalScore: 0, totalGames: 0 };

    res.status(200).json({
      recentSessions: recentAgg,
      totalScore: totals.totalScore,
      totalGames: totals.totalGames,
    });
  } catch (error) {
    console.error("❌ getMySummary error:", error);
    res.status(500).json({
      message: "Erreur résumé utilisateur",
      error: error.message || error,
    });
  }
}

/* ---------------------- Fin de partie (flux Flutter) ---------------------- */
async function endGameSession(req, res) {
  console.log("[/end] IN", {
    param_user_session_id: req.params.user_session_id,
    body: req.body,
    headers_ct: req.headers["content-type"],
  });

  try {
    const { user_session_id } = req.params;

    let session = await UserSession.findOne({ user_session_id }).lean();
    console.log("[/end] session", session && {
      user_session_id: session.user_session_id,
      user_id: session.user_id,
      status: session.status,
      score: session.score,
    });
    if (!session) return res.status(404).json({ message: "UserSession introuvable" });

    const userId = String(session.user_id);

    const scoreFromBody = toNum(req.body?.score_total) ?? toNum(req.body?.score);
    const upd = { };
    if (scoreFromBody !== null) upd.score = scoreFromBody;
    if (Array.isArray(req.body?.answers)) {
      upd.questions_played = req.body.answers.map((i) => ({
        question_id: null, answered: true, is_correct: (toNum(i) ?? -1) >= 0, response_time_ms: null
      }));
    }
    const elapsedMs = toNum(req.body?.elapsedMs);
    if (elapsedMs !== null) upd.elapsed_ms = elapsedMs;
    const streakMax = toNum(req.body?.streakMax);
    if (streakMax !== null) upd.streak_max = streakMax;
    if (session.status !== "ended") {
      upd.status = "ended";
      upd.end_time = new Date();
    }

    const updated = await UserSession.findOneAndUpdate(
      { user_session_id },
      { $set: upd },
      { new: true }
    ).lean();
    console.log("[/end] session updated", {
      score: updated.score, status: updated.status, streak_max: updated.streak_max
    });

    const userDoc = await User.findOne({ user_id: userId }, { score_total:1, achievement_state:1 }).lean();
    if (!userDoc) {
      console.error("[/end] user introuvable pour user_id", userId);
      return res.status(400).json({ message: "Utilisateur introuvable", user_id: userId });
    }

    let out;
    try {
      out = await addSessionScoreAndUnlock(userId, toNum(updated.score) ?? 0);
    } catch (err) {
      console.error("[/end] addSessionScoreAndUnlock ERROR:", err?.message, err);
      return res.status(500).json({ message: "Erreur MAJ total/achievements", detail: String(err?.message || err) });
    }

    const fresh = await User.findOne(
      { user_id: userId },
      { score_total:1, achievement_state:1 }
    ).lean();

    console.log("[/end] OUT", {
      session_score: updated.score,
      score_total: fresh?.score_total,
      achievement_state: fresh?.achievement_state,
      unlocked: out?.newlyUnlocked,
    });

    prewarmRecommendations(userId);

    return res.json({
      ok: true,
      session_score: toNum(updated.score) ?? 0,
      score_total: fresh?.score_total ?? out.total ?? 0,
      achievement_state: fresh?.achievement_state ?? out.allUnlocked ?? [],
      unlocked: out?.newlyUnlocked ?? [],
      elapsed_ms: updated.elapsed_ms ?? null,
      streak_max: updated.streak_max ?? null,
    });
  } catch (e) {
    console.error("[/end] FATAL", e);
    return res.status(500).json({ message: "Erreur fin de partie", detail: String(e?.message || e) });
  }
}

/* ---------------------- NOUVEAU : enregistrement léger (Entraînement) ---------------------- */
/**
 * POST /api/user-sessions/record
 * Body (alias acceptés) :
 *  - user_id | userId | uid
 *  - question_id | questionId | qid
 *  - theme (ou backfill via la question)
 *  - difficulty | level (facultatif, défaut "facile")
 *  - correct | is_correct | success (bool, accepte "true","1","ok"...)
 *  - response_time_ms | time_ms | duration_ms | elapsed_ms
 *  - source (défaut "training")
 */
async function recordTrainingEvent(req, res) {
  try {
    const b = req.body || {};
    const user_id = pick(b, "user_id", "userId", "uid", "user");
    let question_id = pick(b, "question_id", "questionId", "qid", "question");
    let theme = pick(b, "theme", "topic", "category");
    const difficulty = pick(b, "difficulty", "level", "lvl") || "facile";
    const correct = toBool(pick(b, "correct", "is_correct", "good", "success", "result"));
    const response_time_ms = toNum(pick(b, "response_time_ms", "time_ms", "duration_ms", "elapsed_ms", "responseTimeMs"));
    const source = pick(b, "source", "origin") || "training";

    // Backfill du thème si manquant (support _id, question_id, code, name)
    if (!theme && question_id) {
      const qid = String(question_id);
      const or = [{ question_id: qid }, { code: qid }, { name: qid }];
      if (mongoose.isValidObjectId(qid)) {
        or.unshift({ _id: new mongoose.Types.ObjectId(qid) });
      }
      const qDoc = await mongoose.connection
        .collection("questions")
        .findOne({ $or: or }, { projection: { theme: 1 } });
      if (qDoc?.theme) theme = qDoc.theme;
    }

    if (!user_id || !question_id || !theme) {
      return res.status(400).json({ success: false, message: "user_id, question_id, theme sont requis" });
    }

    const now = new Date();
    const payload = {
      user_id: String(user_id),
      question_id: String(question_id),
      theme: String(theme),
      difficulty,
      correct,
      response_time_ms: typeof response_time_ms === "number" ? response_time_ms : undefined,
      source,
      createdAt: now,
      updatedAt: now,
    };

    // Insert direct (tolère l’hétérogénéité historique de la collection)
    await mongoose.connection.collection("usersessions").insertOne(payload);

    prewarmRecommendations(String(user_id));

    return res.status(201).json({ success: true, event: payload });
  } catch (e) {
    console.error("❌ recordTrainingEvent:", e);
    return res.status(500).json({ success: false, message: "Erreur serveur", details: String(e.message || e) });
  }
}

/**
 * GET /api/user-sessions/logs?user_id=&theme=&limit=
 * Liste rapide des événements d’entraînement.
 */
// Lecture rapide des événements d’entraînement
async function listTrainingEvents(req, res) {
  try {
    const q = {};
    if (req.query.user_id) q.user_id = String(req.query.user_id);
    if (req.query.theme) q.theme = String(req.query.theme);
    if (req.query.source) q.source = String(req.query.source); // ex: training|quiz
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 500);

    const items = await mongoose.connection
      .collection("usersessions")
      .find(q)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .project({ _id: 0 })
      .toArray();

    return res.json({ success: true, items });
  } catch (e) {
    console.error("❌ listTrainingEvents:", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

/* ---------------------- EXPORT UNIQUE ---------------------- */
module.exports = {
  createUserSession,
  updateUserSession,
  getUserSessions,
  submitAnswer,
  submitSessionSummary,
  getMySummary,
  endGameSession,

  // nouveaux
  recordTrainingEvent,
  listTrainingEvents,
};
