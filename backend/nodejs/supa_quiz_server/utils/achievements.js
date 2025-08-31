// utils/achievements.js
const ACHIEVEMENTS = [
  { code: "A1", threshold: 1000, avatar: "assets/achievements/ach1.png", title: "Palier 1000" },
  { code: "A2", threshold: 2000, avatar: "assets/achievements/ach2.png", title: "Palier 2000" },
  { code: "A3", threshold: 3000, avatar: "assets/achievements/ach3.png", title: "Palier 3000" },
];

// renvoie { newlyUnlocked, allUnlocked }
function computeUnlocked(scoreTotal, already = []) {
  const unlocked = ACHIEVEMENTS
    .filter(a => scoreTotal >= a.threshold)
    .map(a => a.code);

  const newly = unlocked.filter(code => !already.includes(code));
  return { newlyUnlocked: newly, allUnlocked: unlocked };
}

function avatarsFor(codes = []) {
  return ACHIEVEMENTS
    .filter(a => codes.includes(a.code))
    .map(a => a.avatar);
}

module.exports = { ACHIEVEMENTS, computeUnlocked, avatarsFor };
