const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Rotas públicas (sem autenticação)
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Rotas protegidas (com autenticação)
router.post('/change-password', authenticate, authController.changePassword);
router.get('/me', authenticate, authController.getProfile);
router.put('/me', authenticate, authController.updateProfile);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
