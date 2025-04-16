const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Criar diretório de uploads se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'file-' + uniqueSuffix + extension);
  }
});

// Filtro para tipos de arquivo permitidos
const fileFilter = (req, file, cb) => {
  // Tipos de arquivo permitidos
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg',
    'audio/wav'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Tipo de arquivo não suportado');
    error.code = 'UNSUPPORTED_FILE_TYPE';
    cb(error, false);
  }
};

// Configurar o middleware de upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limite de 10MB
  }
});

const router = express.Router();

// Middleware para todas as rotas
router.use(authenticate);

// Middleware de tratamento de erros do Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'Arquivo muito grande. O tamanho máximo permitido é 10MB.',
        error: err.code
      });
    }
    return res.status(400).json({ 
      message: 'Erro ao fazer upload de arquivo',
      error: err.code
    });
  }
  
  if (err && err.code === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(400).json({ 
      message: 'Tipo de arquivo não suportado. Os formatos aceitos são: imagens, PDF, documentos de texto e planilhas.',
      error: err.code
    });
  }
  
  next(err);
};

// IMPORTANTE: A ordem das rotas importa! Rotas específicas vêm primeiro
// Pré-processamento de arquivo (antes de enviar mensagem)
router.post('/preprocess', upload.single('file'), handleMulterError, uploadController.preprocessFile);

// Upload de arquivo para uma mensagem (deve vir depois da rota específica)
router.post('/:messageId', upload.single('file'), handleMulterError, uploadController.uploadFile);

// Excluir arquivo
router.delete('/:fileId', uploadController.deleteFile);

module.exports = router;
