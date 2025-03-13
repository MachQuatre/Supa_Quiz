const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");

router.post("/", sessionController.startSession);
router.get("/:user_id", sessionController.getUserSessions);

module.exports = router;