const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");

router.get("/analysis/:user_id", aiController.getUserAnalysis);
router.get("/recommendations", aiController.getRecommendations);
router.get("/metrics/dkt", aiController.getDktMetrics);
router.get("/compare", aiController.getComparePolicies);
router.post("/simulate", aiController.postSimulateSession);
router.get("/prewarm", aiController.prewarmRecommendations);

module.exports = router;
