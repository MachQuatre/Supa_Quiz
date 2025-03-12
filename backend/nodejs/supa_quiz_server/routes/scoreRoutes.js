// routes/scoreRoutes.js

const express = require('express');
const router = express.Router();
const scoreController = require('../controllers/scoreController');

// Enregistrer un score depuis Flutter
router.post('/', scoreController.createUserScore);

// (Optionnel) Lister tous les scores
router.get('/', scoreController.getAllScores);

module.exports = router;
