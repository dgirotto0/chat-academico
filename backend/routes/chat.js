const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const chatController = require('../controllers/chatController');
const { authenticate, checkPasswordReset } = require('../middleware/auth');
const { verifySubscriptionActive } = require('../middleware/subscriptionCheck');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

const router = express.Router();

// Middleware para todas as rotas: autenticação, verificação de senha e assinatura
router.use(authenticate);
router.use(checkPasswordReset);
router.use(verifySubscriptionActive);

// Listar chats do usuário
router.get('/', chatController.getUserChats);

// Criar novo chat
router.post('/', [
  body('title').optional().notEmpty().withMessage('Título não pode ser vazio')
], chatController.createChat);

// Obter mensagens de um chat
router.get('/:chatId/messages', chatController.getChatMessages);

// Enviar mensagem e opcionalmente arquivo
router.post('/:chatId/messages', 
  upload.single('file'),
  [
    body('content').optional().isString().withMessage('Conteúdo da mensagem deve ser texto')
  ], 
  chatController.sendMessage
);

// Regenerar resposta para uma mensagem
router.post('/:chatId/regenerate/:messageId', chatController.regenerateMessage);

// Atualizar título do chat
router.put('/:chatId', [
  body('title').notEmpty().withMessage('Título é obrigatório')
], chatController.updateChat);

// Excluir chat
router.delete('/:chatId', chatController.deleteChat);

module.exports = router;
