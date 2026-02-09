const express = require('express');
const router = express.Router();
const { searchSymbols } = require('../controllers/symbolSearchController');

router.get('/', searchSymbols);

module.exports = router;
