const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const { createSession, finishSession } = require("../controllers/thematiqueUserSessionController");

router.post("/", auth, createSession);
router.post("/:userSessionId/finish", auth, finishSession);

module.exports = router;
