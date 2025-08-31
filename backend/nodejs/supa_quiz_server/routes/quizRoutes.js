const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

router.get("/", quizController.getAllQuizzes);
router.get("/mine", authMiddleware, quizController.getMyQuizzes);
router.post("/", authMiddleware, roleMiddleware("admin", "super_user"), quizController.createQuiz);
router.put("/:quizId", authMiddleware, roleMiddleware("admin", "super_user"), quizController.updateQuiz);
router.delete("/:quizId", authMiddleware, roleMiddleware("admin", "super_user"), quizController.deleteQuiz);
router.get("/:quizId/questions", authMiddleware, quizController.getQuizQuestions);
router.delete("/:quizId/questions/:questionId", authMiddleware, roleMiddleware("admin", "super_user"), quizController.deleteQuizQuestion);
router.get("/:quizId", quizController.getQuizById);

module.exports = router;
