const mongoose = require("mongoose");

const snapshotItemSchema = new mongoose.Schema({
  question_id: { type: String },
  text: { type: String, required: true },
  options: { type: [String], required: true },
  correctIndex: { type: Number, required: true }, // 0..3
}, { _id: false });

const questionnaireSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  theme: { type: String, required: true, index: true },
  snapshot: { type: [snapshotItemSchema], required: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("Questionnaire", questionnaireSchema);
