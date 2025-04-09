const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, sessionController.startSession);
router.get("/:user_id", authMiddleware, sessionController.getUserSessions);

module.exports = router;
