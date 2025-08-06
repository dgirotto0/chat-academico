const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const chatController = require('../controllers/chatController');
const { authenticate, checkPasswordReset } = require('../middleware/auth');
const { validateChatAccess, validateMessageAccess } = require('../middleware/security');

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

// Middleware para todas as rotas: autenticação e verificação de senha
router.use(authenticate);
router.use(checkPasswordReset);

// Rotas do chat
router.get('/', chatController.getUserChats);
router.post('/', [
  body('title').optional().notEmpty().withMessage('Título não pode ser vazio')
], chatController.createChat);

// Rotas que precisam de validação de acesso ao chat
router.get('/:chatId/messages', validateChatAccess, chatController.getChatMessages);
router.post('/:chatId/messages', 
  upload.single('file'),
  validateChatAccess,
  [
    body('content').optional().isString().withMessage('Conteúdo da mensagem deve ser texto')
  ], 
  chatController.sendMessage);
router.put('/:chatId', [
  body('title').notEmpty().withMessage('Título é obrigatório')
], validateChatAccess, chatController.updateChat);
router.delete('/:chatId', validateChatAccess, chatController.deleteChat);
router.post('/:chatId/regenerate/:messageId', validateChatAccess, validateMessageAccess, chatController.regenerateMessage);

// Editar mensagem com validação de acesso
router.put('/:chatId/messages/:messageId', 
  validateChatAccess, 
  validateMessageAccess, 
  [ body('content').notEmpty().withMessage('O conteúdo não pode ser vazio') ],
  chatController.editMessage
);

module.exports = router;
