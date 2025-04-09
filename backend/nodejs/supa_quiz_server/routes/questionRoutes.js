const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

router.get("/", questionController.getAllQuestions);
router.get("/:id", questionController.getQuestionById);
router.get("/theme/:theme", questionController.getQuestionsByTheme);
router.post("/", authMiddleware, roleMiddleware("admin", "super_user"), questionController.createQuestion);
router.put("/:id", authMiddleware, roleMiddleware("admin", "super_user"), questionController.updateQuestion);
router.delete("/:id", authMiddleware, roleMiddleware("admin", "super_user"), questionController.deleteQuestion);

module.exports = router;
