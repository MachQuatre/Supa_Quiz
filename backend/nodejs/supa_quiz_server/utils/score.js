// utils/score.js

/**
 * Outils de gestion des scores utilisateurs
 * -----------------------------------------
 * - computeUserTotalScore(userId, { onlyFinished }): calcule le total à partir des UserSession
 * - recomputeAndPersistTotalScore(userId, opts): calcule puis persiste le total dans User.score_total
 *
 * Hypothèses:
 * - UserSession possède: user_id (String|Number stocké en String), score (Number), end_time (Date|null), completion_percentage (Number 0..100)
 * - User possède: user_id (String), score_total (Number), achievement_state (Array) etc.
 */

const UserSession = require("../models/userSessionModel");
const User = require("../models/userModel");

/**
 * Retourne un match pour les sessions "terminées".
 * Par défaut: on considère une session finie si `end_time` est défini
 *   OU si `completion_percentage >= 95`.
 */
function finishedSessionMatch() {
  return {
    $or: [
      { end_time: { $type: "date" } },
      { completion_percentage: { $gte: 95 } },
    ],
  };
}

/**
 * Calcule la somme des scores pour un utilisateur, à partir des UserSession.
 * @param {string|number} userId
 * @param {{onlyFinished?: boolean}} opts
 * @returns {Promise<number>} total
 */
async function computeUserTotalScore(userId, opts = {}) {
  const { onlyFinished = true } = opts;
  const userIdStr = String(userId);

  const match = { user_id: userIdStr };
  if (onlyFinished) {
    Object.assign(match, finishedSessionMatch());
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ["$score", 0] } },
      },
    },
    { $project: { _id: 0, total: 1 } },
  ];

  const agg = await UserSession.aggregate(pipeline).allowDiskUse(true);
  const total = agg?.[0]?.total ?? 0;

  return Number.isFinite(total) ? total : 0;
}

/**
 * Recalcule puis persiste le score total côté User.score_total.
 * Crée le document utilisateur si nécessaire (upsert).
 * @param {string|number} userId
 * @param {{onlyFinished?: boolean}} opts
 * @returns {Promise<number>} user_total_score (valeur persistée)
 */
async function recomputeAndPersistTotalScore(userId, opts = {}) {
  const userIdStr = String(userId);
  const user_total_score = await computeUserTotalScore(userIdStr, opts);

  await User.updateOne(
    { user_id: userIdStr },
    { $set: { score_total: user_total_score } },
    { upsert: true }
  );

  return user_total_score;
}

module.exports = {
  computeUserTotalScore,
  recomputeAndPersistTotalScore,
};
