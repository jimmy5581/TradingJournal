const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const accountController = require('../controllers/accountController');

router.get('/', authMiddleware, accountController.getAccount);
router.put('/', authMiddleware, accountController.updateAccount);
router.post('/2fa', authMiddleware, accountController.toggle2FA);
router.post('/avatar', authMiddleware, accountController.uploadMiddleware, accountController.uploadAvatar);

module.exports = router;
