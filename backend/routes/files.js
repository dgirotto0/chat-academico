const express = require('express');
const FileController = require('../controllers/fileController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

// Gerar arquivo
router.post('/generate', FileController.generateFile);

// Download de arquivo gerado
router.get('/download/generated/:filename', FileController.downloadGeneratedFile);

// Listar arquivos gerados
router.get('/generated', FileController.listGeneratedFiles);

// Deletar arquivo gerado
router.delete('/generated/:filename', FileController.deleteGeneratedFile);

module.exports = router;
