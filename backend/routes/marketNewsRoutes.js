const express = require('express');
const router = express.Router();
const { getMarketNews, refreshNewsCache } = require('../controllers/marketNewsController');

// GET /api/market-news
router.get('/', getMarketNews);

// POST /api/market-news/refresh
router.post('/refresh', refreshNewsCache);

module.exports = router;
