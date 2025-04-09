const express = require("express");
const router = express.Router();
const responseController = require("../controllers/responseController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, responseController.submitResponse);

module.exports = router;
