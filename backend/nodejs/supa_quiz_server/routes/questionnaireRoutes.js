const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const { createQuestionnaire } = require("../controllers/questionnaireController");

router.post("/", auth, createQuestionnaire);

module.exports = router;
