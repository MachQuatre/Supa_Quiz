const express = require("express");
const router = express.Router();
const ClassController = require("../controllers/ClassController");

router.get("/leaderboard/general", ClassController.getGeneralLeaderboard);
router.get("/leaderboard/category/:categoryName", ClassController.getCategoryLeaderboard);

module.exports = router;
