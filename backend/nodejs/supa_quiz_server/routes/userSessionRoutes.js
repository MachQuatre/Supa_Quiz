const express = require("express");
const router = express.Router();
const controller = require("../controllers/userSessionController");
const userSessionController = require("../controllers/userSessionController");


router.post("/", controller.createUserSession);
router.patch("/:user_session_id", controller.updateUserSession);
router.get("/user/:user_id", controller.getUserSessions);
router.post("/:user_session_id/answer", controller.submitAnswer);
router.post("/:user_session_id/summary", userSessionController.submitSessionSummary);

module.exports = router;
