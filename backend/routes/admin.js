const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Proteger todas as rotas de admin
router.use(authenticate);
router.use(isAdmin);

// Listar todos os usuários
router.get('/users', adminController.getUsers);

// Criar novo usuário
router.post('/users', [
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('role').optional().isIn(['admin', 'aluno']).withMessage('Perfil deve ser admin ou aluno')
], adminController.createUser);

// Atualizar usuário
router.put('/users/:id', [
  body('name').optional().notEmpty().withMessage('Nome não pode ser vazio'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('role').optional().isIn(['admin', 'aluno']).withMessage('Perfil deve ser admin ou aluno'),
  body('active').optional().isBoolean().withMessage('Status deve ser booleano')
], adminController.updateUser);

// Excluir usuário
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
