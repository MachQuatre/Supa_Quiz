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
      user_session_id: uuidv4(),   // reste un UUID public
      user_id: String(rawUserId),  // ✅ toujours l'UUID users.user_id
      game_session_id,
      quiz_id,
      theme,
    });

    await session.save();
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

/* ---------------------- Enregistrer une réponse ---------------------- */
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
    // ❗️NE PAS redéclarer deux fois — on destructure une seule fois
    const { questions_played, score, completion_percentage } = req.body || {};

    const session = await UserSession.findOne({ user_session_id }); // ✅ clé correcte
    if (!session) {
      return res.status(404).json({ message: "Session non trouvée" });
    }

    // Coercition numérique sûre (le front peut envoyer des strings)
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
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
/**
 * GET /api/user-sessions/me/summary
 * - Avec auth: req.user._id / req.user.id
 * - Sans auth: ?user_id=xxx  (fallback req.params.user_id)
 *
 * Réponse:
 * {
 *   recentSessions: [{ user_session_id, quizTitle, gameCode, score, date }],
 *   totalScore: Number,
 *   totalGames: Number
 * }
 */
async function getMySummary(req, res) {
  try {
    // 1) On force un userId clair
    const userId =
      (req.user && (req.user.id || req.user._id)) ||
      req.query.user_id ||
      req.params.user_id;

    if (!userId) {
      return res.status(400).json({ message: "user_id manquant (auth ou query param)" });
    }

    // 2) Dernières 10 sessions de CE user_id
    const recentAgg = await UserSession.aggregate([
      { $match: { user_id: String(userId) } },
      {
        $addFields: {
          _date: { $ifNull: ["$end_time", "$start_time"] }, // priorité fin
        },
      },
      { $sort: { _date: -1 } },
      { $limit: 10 },

      // Lookup Quiz (supporte quiz_id string OU ObjectId)
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

      // Lookup GameSession par code : game_session_id (UserSession) ⇄ session_id (GameSession)
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
          quizTitle: {
            $ifNull: ["$quizDoc.title", { $ifNull: ["$quizDoc.name", "Quiz"] }],
          },
          gameCode: { $ifNull: ["$gameDoc.session_id", null] },
        },
      },
    ]);

    // 3) Totaux (sur TOUTES les sessions de ce user)
    const totalsAgg = await UserSession.aggregate([
      { $match: { user_id: String(userId) } },
      {
        $group: {
          _id: null,
          totalScore: { $sum: "$score" },
          totalGames: { $sum: 1 },
        },
      },
    ]);
    const totals = totalsAgg[0] || { totalScore: 0, totalGames: 0 };

    // 4) Réponse
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

async function endGameSession(req, res) {
  // ---- DIAG ENTRÉE
  console.log("[/end] IN", {
    param_user_session_id: req.params.user_session_id,
    body: req.body,
    headers_ct: req.headers["content-type"],
  });

  try {
    const { user_session_id } = req.params;

    // 1) Session
    let session = await UserSession.findOne({ user_session_id }).lean();
    console.log("[/end] session", session && {
      user_session_id: session.user_session_id,
      user_id: session.user_id,
      status: session.status,
      score: session.score,
    });
    if (!session) return res.status(404).json({ message: "UserSession introuvable" });

    const userId = String(session.user_id);

    // 2) Coercition numérique robuste
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    // 3) Mettre à jour la session avec le score/stats reçus
    const scoreFromBody = toNum(req.body?.score_total) ?? toNum(req.body?.score);
    const upd = { };
    if (scoreFromBody !== null) upd.score = scoreFromBody;
    if (Array.isArray(req.body?.answers)) upd.questions_played = req.body.answers.map((i) => ({
      question_id: null, answered: true, is_correct: (toNum(i) ?? -1) >= 0, response_time_ms: null
    }));
    const elapsedMs = toNum(req.body?.elapsedMs);
    if (elapsedMs !== null) upd.elapsed_ms = elapsedMs;
    const streakMax = toNum(req.body?.streakMax);
    if (streakMax !== null) upd.streak_max = streakMax;
    if (session.status !== "ended") {
      upd.status = "ended";
      upd.end_time = new Date();
    }

    // ⚠️ Sauvegarde (et relis)
    const updated = await UserSession.findOneAndUpdate(
      { user_session_id },
      { $set: upd },
      { new: true }
    ).lean();
    console.log("[/end] session updated", {
      score: updated.score, status: updated.status, streak_max: updated.streak_max
    });

    // 4) Vérifier que l'utilisateur existe (cause typique des 500)
    const userDoc = await User.findOne({ user_id: userId }, { score_total:1, achievement_state:1 }).lean();
    if (!userDoc) {
      console.error("[/end] user introuvable pour user_id", userId);
      return res.status(400).json({ message: "Utilisateur introuvable", user_id: userId });
    }

    // 5) Incrément du total + achievements
    let out;
    try {
      out = await addSessionScoreAndUnlock(userId, toNum(updated.score) ?? 0);
    } catch (err) {
      console.error("[/end] addSessionScoreAndUnlock ERROR:", err?.message, err);
      return res.status(500).json({ message: "Erreur MAJ total/achievements", detail: String(err?.message || err) });
    }

    // 6) Snapshot final user
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



/* ---------------------- EXPORT UNIQUE ---------------------- */
module.exports = {
  createUserSession,
  updateUserSession,
  getUserSessions,
  submitAnswer,
  submitSessionSummary,
  getMySummary,
  endGameSession,
};
