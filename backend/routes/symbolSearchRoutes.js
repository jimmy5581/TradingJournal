const express = require('express');
const router = express.Router();
const { searchSymbols } = require('../controllers/symbolSearchController');

// GET /api/symbol-search?q=<query>
router.get('/', searchSymbols);

module.exports = router;
