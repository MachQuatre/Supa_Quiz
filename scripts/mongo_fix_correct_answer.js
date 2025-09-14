// scripts/mongo_fix_correct_answer.js
db = db.getSiblingDB("quiz_app");
const L = ["A","B","C","D"];
db.questions.find({ correct_answer: { $in: L } }).forEach(q => {
  const i = L.indexOf(q.correct_answer);
  if (i >= 0 && Array.isArray(q.answer_options) && q.answer_options[i] != null) {
    db.questions.updateOne(
      { _id: q._id },
      { $set: { correct_answer: q.answer_options[i] } }
    );
  }
});
