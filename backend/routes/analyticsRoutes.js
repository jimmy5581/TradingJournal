const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/summary', analyticsController.getSummary);
router.get('/behavior', analyticsController.getBehaviorAnalysis);
router.get('/equity-curve', analyticsController.getEquityCurve);
router.get('/trading-volume', analyticsController.getTradingVolume);

module.exports = router;
