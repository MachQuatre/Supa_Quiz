/* eslint-disable no-console */
const path = require("path");
const mongoose = require("mongoose");

const achievementsPath = path.join(__dirname, "..", "utils", "achievements");
const userModelPath    = path.join(__dirname, "..", "models", "userModel");
const userSessionPath  = path.join(__dirname, "..", "models", "userSessionModel");

const { computeUnlocked } = require(achievementsPath);
const User = require(userModelPath);
const UserSession = require(userSessionPath);

// charge .env si présent
try { require("dotenv").config({ path: path.join(__dirname, "..", ".env") }); } catch (_) {}

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/quiz_app";

function toIntSafe(v){ const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; }

async function recomputeTotalForUser(userId) {
  const uid = String(userId);
  const agg = await UserSession.aggregate([
    { $match: { user_id: uid } },
    { $group: { _id: "$user_id", totalScore: { $sum: { $convert: { input: { $ifNull: ["$score", 0] }, to: "int", onError: 0, onNull: 0 } } } } },
  ]);
  return agg.length ? agg[0].totalScore : 0;
}

// ⚠️ IMPORTANT: fonction exportable, pas de process.exit ici
async function runUpdateUsers({ fix = false } = {}) {
  console.log(`🔌 Connexion à MongoDB : ${MONGO_URI} (${fix ? "MODE ÉCRITURE" : "DRY-RUN"})`);
  await mongoose.connect(MONGO_URI);

  try {
    const users = await User.find({}, { user_id: 1, username: 1, score_total: 1, achievement_state: 1 }).lean();

    let totalsChanged = 0, achievementsChanged = 0;
    for (const u of users) {
      const uid = u.user_id || String(u._id);
      if (!uid) continue;

      const recomputedTotal = await recomputeTotalForUser(uid);
      const oldTotal = toIntSafe(u.score_total);
      const shouldUpdateTotal = recomputedTotal !== oldTotal;

      const already = Array.isArray(u.achievement_state) ? u.achievement_state : [];
      const { allUnlocked } = computeUnlocked(recomputedTotal, already);
      const merged = Array.from(new Set([ ...already, ...allUnlocked ]));
      const shouldUpdateAchievements = merged.length !== already.length || merged.some(c => !already.includes(c));

      if (shouldUpdateTotal || shouldUpdateAchievements) {
        console.log(`→ ${u.username || uid} | total: ${oldTotal} -> ${recomputedTotal} | achievements: [${already}] -> [${merged}]`);
      }

      if (fix && (shouldUpdateTotal || shouldUpdateAchievements)) {
        const updateDoc = {};
        if (shouldUpdateTotal) { updateDoc.score_total = recomputedTotal; totalsChanged++; }
        if (shouldUpdateAchievements) { updateDoc.achievement_state = merged; achievementsChanged++; }
        await User.updateOne({ user_id: uid }, { $set: updateDoc }, { upsert: false });
      }
    }

    console.log(`📊 Terminé. ${fix ? "Écritures appliquées." : "Aucune écriture (dry-run)."}`);
    if (fix) {
      console.log(`   • Totaux corrigés: ${totalsChanged}`);
      console.log(`   • Achievements mis à jour: ${achievementsChanged}`);
    }
  } finally {
    // ferme proprement la connexion OU laisse-la au serveur si importée ? On la ferme, mais le serveur a sa propre connexion ailleurs.
    await mongoose.disconnect();
    console.log("🔌 Déconnecté.");
  }
}

// 👉 Si lancé en CLI, on exécute. Sinon, on exporte seulement.
if (require.main === module) {
  const FIX_MODE = process.argv.includes("--fix");
  runUpdateUsers({ fix: FIX_MODE })
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { runUpdateUsers };
