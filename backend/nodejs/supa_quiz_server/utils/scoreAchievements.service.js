const User = require("../models/userModel");
const UserSession = require("../models/userSessionModel");

const THRESHOLDS = [
  { code: "A1", min: 1000 },
  { code: "A2", min: 2000 },
  { code: "A3", min: 3000 },
];

function computeTargetUnlocks(total) {
  return THRESHOLDS.filter(t => total >= t.min).map(t => t.code);
}

/** 🔒 Version “incrément + union” : atomique, idempotente */
async function addSessionScoreAndUnlock(userId, sessionScore) {
  // 1) Incrémente le total
  const afterInc = await User.findOneAndUpdate(
    { user_id: String(userId) },
    { $inc: { score_total: sessionScore } },
    { new: true, projection: { score_total: 1, achievement_state: 1 } }
  ).lean();

  if (!afterInc) throw new Error("User introuvable");

  const target = computeTargetUnlocks(afterInc.score_total);

  // 2) ⚠️ Union robuste (évite tout écrasement par ailleurs)
  const union = Array.from(new Set([...(afterInc.achievement_state || []), ...target]));

  // 3) Écrit l’union (pas seulement les “missing”)
  if (union.length !== (afterInc.achievement_state || []).length) {
    await User.updateOne(
      { user_id: String(userId) },
      { $set: { achievement_state: union } }
    );
  }

  // “newlyUnlocked” = ce que cette session a réellement ajouté
  const newlyUnlocked = union.filter(x => !(afterInc.achievement_state || []).includes(x));
  return { total: afterInc.score_total, newlyUnlocked, allUnlocked: union };
}

/** 🔄 Version “recompute” depuis UserSession.status="ended" */
async function recomputeTotalAndUnlock(userId) {
  const agg = await UserSession.aggregate([
    { $match: { user_id: String(userId), status: "ended" } },
    { $group: { _id: null, total: { $sum: "$score" } } }
  ]);

  const total = agg.length ? agg[0].total : 0;

  const before = await User.findOneAndUpdate(
    { user_id: String(userId) },
    { $set: { score_total: total } },
    { new: false, projection: { achievement_state: 1 } } // old doc
  ).lean();

  const current = before?.achievement_state || [];
  const target = computeTargetUnlocks(total);
  const union = Array.from(new Set([...current, ...target]));

  if (union.length !== current.length) {
    await User.updateOne(
      { user_id: String(userId) },
      { $set: { achievement_state: union } }
    );
  }

  const newlyUnlocked = union.filter(x => !current.includes(x));
  return { total, newlyUnlocked, allUnlocked: union };
}

module.exports = { addSessionScoreAndUnlock, recomputeTotalAndUnlock };
