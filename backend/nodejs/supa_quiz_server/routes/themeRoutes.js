const express = require("express");
const router = express.Router();
const { getThemes, getAvailableThemes } = require("../controllers/themeController");

router.get("/", getThemes);
router.get("/available", getAvailableThemes); 

module.exports = router;
