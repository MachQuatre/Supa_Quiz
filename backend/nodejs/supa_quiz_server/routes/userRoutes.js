const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/:user_id/score-total", authMiddleware, userController.getTotalScore);
router.get("/:user_id/history", authMiddleware, userController.getHistory);
router.post("/:user_id/photo", authMiddleware, userController.uploadPhoto);
router.patch("/:user_id/avatar",     authMiddleware, userController.updateAvatar);
router.patch("/:user_id/achievement", authMiddleware, userController.updateAchievement);
router.get  ("/:user_id/achievement", authMiddleware, userController.getAchievement);
router.patch("/:user_id/avatar", authMiddleware, userController.updateAvatar);

module.exports = router;
