const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

router.get("/", quizController.getAllQuizzes);
router.get("/mine", authMiddleware, quizController.getMyQuizzes);
router.get("/:quizId", quizController.getQuizById);
router.post("/", authMiddleware, roleMiddleware("admin", "super_user"), quizController.createQuiz);
router.put("/:quizId", authMiddleware, roleMiddleware("admin", "super_user"), quizController.updateQuiz);
router.delete("/:quizId", authMiddleware, roleMiddleware("admin", "super_user"), quizController.deleteQuiz);

module.exports = router;
