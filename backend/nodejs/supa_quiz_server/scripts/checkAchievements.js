// backend/nodejs/supa_quiz_server/scripts/checkAchievements.js
/* eslint-disable no-console */
const path = require("path");
const mongoose = require("mongoose");

const achievementsPath = path.join(__dirname, "..", "utils", "achievements");
const userModelPath    = path.join(__dirname, "..", "models", "userModel");
const userSessionPath  = path.join(__dirname, "..", "models", "userSessionModel");

const { computeUnlocked } = require(achievementsPath);
const User = require(userModelPath);
const UserSession = require(userSessionPath);

// charge .env
try { require("dotenv").config({ path: path.join(__dirname, "..", ".env") }); } catch (_) {}

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/QuizDev";

function toIntSafe(v){ const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; }

async function recomputeTotalForUser(userId) {
  const uid = String(userId);
  const agg = await UserSession.aggregate([
    { $match: { user_id: uid } },
    {
      $group: {
        _id: "$user_id",
        totalScore: {
          $sum: {
            $convert: { input: { $ifNull: ["$score", 0] }, to: "int", onError: 0, onNull: 0 }
          }
        }
      }
    }
  ]);
  return agg.length ? agg[0].totalScore : 0;
}

async function run(userId) {
  if (!userId) throw new Error("Missing --user-id");

  await mongoose.connect(MONGO_URI);

  try {
    const uid = String(userId);

    // 1) Recalcule et persiste score_total
    const total = await recomputeTotalForUser(uid);
    await User.updateOne({ user_id: uid }, { $set: { score_total: total } }, { upsert: false });

    // 2) MAJ achievements selon seuils (A1/A2/A3) en gardant l’existant
    const user = await User.findOne({ user_id: uid }, { achievement_state: 1 }).lean();
    const already = Array.isArray(user?.achievement_state) ? user.achievement_state : [];
    const { newlyUnlocked, allUnlocked } = computeUnlocked(total, already);

    if (newlyUnlocked.length) {
      await User.updateOne(
        { user_id: uid },
        { $addToSet: { achievement_state: { $each: newlyUnlocked } } },
        { upsert: false }
      );
    }

    console.log(`✔ checkAchievements ok - user:${uid} total:${total} unlocked:${newlyUnlocked?.join(",") || "none"}`);
  } finally {
    await mongoose.disconnect();
  }
}

// Lancement CLI: node scripts/checkAchievements.js --user-id <uuid>
if (require.main === module) {
  const idx = process.argv.indexOf("--user-id");
  const userId = idx >= 0 ? process.argv[idx + 1] : null;
  run(userId)
    .then(() => process.exit(0))
    .catch(err => { console.error("checkAchievements error:", err); process.exit(1); });
}

module.exports = { run };
