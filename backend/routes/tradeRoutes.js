const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', tradeController.createTrade);
router.get('/', tradeController.getAllTrades);
router.get('/:id', tradeController.getTradeById);
router.put('/:id', tradeController.updateTrade);
router.delete('/:id', tradeController.deleteTrade);

module.exports = router;
