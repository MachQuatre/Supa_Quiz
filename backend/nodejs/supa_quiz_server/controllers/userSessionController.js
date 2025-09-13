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
// Remplace la fonction existante par celle-ci
async function updateUserSession(req, res) {
  try {
    const { id } = req.params; // PUT /api/user-sessions/:id
    const upd = {};

    // --- Helpers locaux ---
    const toBool = (v) => v === true || v === 1 || v === '1' || v === 'true';
    const toIntOrNull = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    };

    // 1) Champs simples (si présents)
    const allowedSimple = ['score_total', 'duration_ms', 'ended_at', 'status'];
    for (const k of allowedSimple) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) {
        upd[k] = req.body[k];
      }
    }

    // 2) Normalisation des questions jouées
    if (Array.isArray(req.body?.questions_played)) {
      const qp = [];

      for (const raw of req.body.questions_played) {
        if (!raw || typeof raw !== 'object') continue;

        const item = {
          // on considère "answered" true par défaut si non fourni
          answered: raw.answered === false ? false : true,
          is_correct: toBool(raw.is_correct),
        };

        // garder question_id UNIQUEMENT s'il est non vide
        const qid = raw.question_id ?? raw.qid ?? raw.id ?? raw._id;
        if (qid != null && String(qid).trim() !== '') {
          item.question_id = String(qid);
        }

        const rt = toIntOrNull(raw.response_time_ms);
        if (rt != null) item.response_time_ms = rt;

        if (raw.theme) item.theme = String(raw.theme);
        if (raw.difficulty) item.difficulty = String(raw.difficulty);

        qp.push(item);
      }

      // dédoublonnage par question_id (on garde la dernière occurrence)
      const seen = new Map(); // key: question_id, value: item
      const finalQp = [];
      for (const it of qp.reverse()) {
        if (it.question_id) {
          if (!seen.has(it.question_id)) seen.set(it.question_id, it);
        } else {
          // éléments sans question_id : on les conserve tels quels
          finalQp.push(it);
        }
      }
      // réassemble en remettant l'ordre initial approximatif
      upd.questions_played = [...finalQp, ...Array.from(seen.values()).reverse()];
    }
    // 3) Fallback LEGACY: "answers": [0/1/true/false, ...]
    else if (Array.isArray(req.body?.answers)) {
      // ⚠️ NE PAS mettre question_id:null ici.
      upd.questions_played = req.body.answers.map((v) => ({
        answered: true,
        is_correct: toBool(v),
        response_time_ms: null,
      }));
    }

    // 4) Mise à jour
    const session = await UserSession.findByIdAndUpdate(
      id,
      { $set: upd },
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    return res.json({ success: true, data: session });
  } catch (err) {
    console.error('updateUserSession error:', err);
    return res.status(500).json({ success: false, error: 'server_error' });
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

    // 1) Récupérer question_id depuis plusieurs alias / objets imbriqués
    let rawQ = pick(
      b,
      "question_id", "questionId", "QuestionId", "questionID",
      "qid", "id", "question"
    );

    // support des payloads du type { question: {...} } ou { question_id: {...} }
    const extractFromObj = (o) => {
      if (!o || typeof o !== "object") return undefined;
      return (
        o.question_id ??
        o.questionId ??
        o.id ??
        o._id ??
        o.code ??
        o.name ??
        o.slug ??
        o.ref
      );
    };
    if (rawQ && typeof rawQ === "object") rawQ = extractFromObj(rawQ);
    if (!rawQ && typeof b.question === "object") rawQ = extractFromObj(b.question);

    // normalisation string
    let question_id = rawQ != null ? String(rawQ).trim() : "";

    // 2) Thème (ou backfill via question)
    let theme = pick(b, "theme", "topic", "category");
    const difficulty = pick(b, "difficulty", "level", "lvl") || "facile";
    const correct = toBool(pick(b, "correct", "is_correct", "good", "success", "result"));
    const response_time_ms = toNum(pick(b, "response_time_ms", "time_ms", "duration_ms", "elapsed_ms", "responseTimeMs"));
    const source = pick(b, "source", "origin") || "training";

    // 3) Canoniser le question_id contre la collection questions (support _id, question_id, code, name)
    let canonicalQid = question_id;
    if (question_id) {
      const or = [{ question_id }, { code: question_id }, { name: question_id }, { slug: question_id }, { ref: question_id }];
      if (mongoose.isValidObjectId(question_id)) {
        or.unshift({ _id: new mongoose.Types.ObjectId(question_id) });
      }
      const qDoc = await mongoose.connection
        .collection("questions")
        .findOne({ $or: or }, { projection: { question_id: 1, theme: 1 } });

      if (qDoc?.question_id) canonicalQid = String(qDoc.question_id);
      if (!theme && qDoc?.theme) theme = qDoc.theme;
    }

    // 4) Garde-fous : on refuse l’event si on n’a pas d’ID canonique
    if (!user_id || !canonicalQid || !theme) {
      return res.status(400).json({
        success: false,
        message: "user_id, question_id, theme requis",
        debug: { user_id, canonicalQid, theme }
      });
    }

    const now = new Date();
    const payload = {
      user_id: String(user_id),
      question_id: canonicalQid,                 // ✅ ID canonique aligné sur questions.question_id
      theme: String(theme),
      difficulty,
      correct,
      response_time_ms: typeof response_time_ms === "number" ? response_time_ms : undefined,
      source,
      createdAt: now,
      updatedAt: now,
    };

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
