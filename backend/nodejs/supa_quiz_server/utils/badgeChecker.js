const badgeRules = require("./badgeRules");

async function checkAndAssignBadges(stats, models) {
  const { user_id } = stats;
  const assigned = [];

  for (const rule of badgeRules) {
    const alreadyHas = await models.UserBadge.findOne({
      user_id,
      badge_id: rule.badge_id
    });

    if (alreadyHas) continue;

    const success = await rule.condition(stats, models);
    if (success) {
      await models.UserBadge.create({
        user_id,
        badge_id: rule.badge_id
      });
      assigned.push(rule.badge_id);
    }
  }

  return assigned;
}

module.exports = { checkAndAssignBadges };
