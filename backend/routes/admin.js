const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Middleware para todas as rotas: autenticação e verificação de admin
router.use(authenticate);
router.use(requireAdmin);

// Rotas de administração
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/stats', adminController.getStats);

module.exports = router;
