const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const accountController = require('../controllers/accountController');

router.get('/profile', authMiddleware, accountController.getProfile);
router.put('/profile', authMiddleware, accountController.updateProfile);
router.post('/profile/avatar', authMiddleware, accountController.uploadMiddleware, accountController.updateAvatar);

module.exports = router;
