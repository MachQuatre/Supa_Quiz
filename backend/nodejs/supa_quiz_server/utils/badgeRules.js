module.exports = [
  {
    badge_id: "high_scorer",
    name: "Excellent Score",
    description: "A obtenu un score ≥ 80% à un quiz",
    condition: (stats) => stats.score_percent >= 80
  },
  {
    badge_id: "perfect_theme_master",
    name: "Maître d’un thème",
    description: "A obtenu 100% dans un thème",
    condition: (stats) => stats.score_percent === 100 && !!stats.theme
  },
  {
    badge_id: "ten_quizzes",
    name: "Quiz Addict",
    description: "A terminé au moins 10 quiz",
    condition: async (stats, models) => {
      const count = await models.Quiz.countDocuments({ created_by: stats.user_id });
      return count >= 10;
    }
  }
];
