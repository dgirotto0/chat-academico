const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Login - rota pública
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Digite um email válido'),
    body('password').notEmpty().withMessage('Senha é obrigatória')
  ],
  authController.login
);

// Obter perfil - requer autenticação
router.get('/profile', authenticate, authController.getProfile);

// Redefinir senha obrigatória - requer autenticação
router.post(
  '/reset-password',
  authenticate,
  [
    body('oldPassword').notEmpty().withMessage('Senha atual é obrigatória'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Nova senha deve ter pelo menos 6 caracteres')
      .matches(/\d/)
      .withMessage('Nova senha deve conter pelo menos um número')
  ],
  authController.resetRequiredPassword
);

// Esqueci minha senha - rota pública
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Digite um email válido')],
  authController.forgotPassword
);

// Reset via token - rota pública
router.post(
  '/reset-password-with-token',
  [
    body('token').notEmpty().withMessage('Token é obrigatório'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Nova senha deve ter pelo menos 6 caracteres')
      .matches(/\d/)
      .withMessage('Nova senha deve conter pelo menos um número')
  ],
  authController.resetPasswordWithToken
);

module.exports = router;
