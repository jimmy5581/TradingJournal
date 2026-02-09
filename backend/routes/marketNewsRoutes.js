const express = require('express');
const router = express.Router();
const { getMarketNews, refreshNewsCache } = require('../controllers/marketNewsController');

router.get('/', getMarketNews);

router.post('/refresh', refreshNewsCache);

module.exports = router;
