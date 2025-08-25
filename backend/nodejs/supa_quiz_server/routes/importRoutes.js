const express = require("express");
const router = express.Router();
const { importQuestionnaire } = require("../controllers/importController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

// Route POST /api/import/questionnaire
router.post(
  "/questionnaire",
  authMiddleware,
  roleMiddleware("admin", "super_user"),
  importQuestionnaire
);

module.exports = router;
