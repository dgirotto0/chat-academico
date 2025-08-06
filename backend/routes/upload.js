const express = require('express');
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const { validateFileAccess } = require('../middleware/security');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

// Pré-processamento de arquivo (antes de enviar mensagem)
router.post('/preprocess', uploadController.preprocessFile);

// Associar arquivo a uma mensagem específica
router.post('/:messageId/attach', uploadController.attachFileToMessage);

// Baixar arquivo
router.get('/:fileId/download', validateFileAccess, uploadController.downloadFile);

// Excluir arquivo
router.delete('/:fileId', validateFileAccess, uploadController.deleteFile);

// DEBUG: Reprocessar arquivo existente
router.post('/reprocess/:fileId', validateFileAccess, uploadController.reprocessFile);

module.exports = router;
