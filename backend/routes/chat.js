const express = require('express');
const { body } = require('express-validator');
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Middleware para todas as rotas
router.use(authenticate);

// Listar chats do usuário
router.get('/', chatController.getUserChats);

// Criar novo chat
router.post('/', [
  body('title').optional().notEmpty().withMessage('Título não pode ser vazio')
], chatController.createChat);

// Obter mensagens de um chat
router.get('/:chatId/messages', chatController.getChatMessages);

// Enviar mensagem e obter resposta
router.post('/:chatId/messages', [
  body('content').notEmpty().withMessage('Conteúdo da mensagem é obrigatório')
], chatController.sendMessage);

// Regenerar resposta para uma mensagem
router.post('/:chatId/regenerate/:messageId', chatController.regenerateMessage);

// Atualizar título do chat
router.put('/:chatId', [
  body('title').notEmpty().withMessage('Título é obrigatório')
], chatController.updateChat);

// Excluir chat
router.delete('/:chatId', chatController.deleteChat);

module.exports = router;
