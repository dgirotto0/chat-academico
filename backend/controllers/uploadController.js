const { Message, File, Chat } = require('../models');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const FileProcessingService = require('../services/fileProcessingService');

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Documentos
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'application/vnd.ms-powerpoint', // ppt
    
    // Planilhas
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'text/csv',
    'application/csv',
    
    // Texto
    'text/plain', // txt, tex, py, r, yaml, md
    'application/x-tex', // tex
    'text/x-tex', // tex
    'application/x-latex', // tex
    'text/markdown', // md
    'application/json', // json
    'application/xml', // xml
    'text/xml', // xml
    'application/x-yaml', // yaml
    'text/yaml', // yaml
    'text/x-yaml', // yaml
    
    // Bibliografia
    'application/x-bibtex', // bib
    'text/x-bibtex', // bib
    'application/x-research-info-systems', // ris
    'text/x-research-info-systems', // ris
    
    // Imagens
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff', // tif
    'image/tif', // tif
    'image/bmp',
    'image/svg+xml',
    
    // Código e dados
    'application/x-python-code', // py
    'text/x-python', // py
    'application/x-ipynb+json', // ipynb
    'text/x-r-source', // r
    'application/x-r-data', // r
    'application/matlab-mat', // mat
    'application/x-matlab-data', // mat, m
    'text/x-matlab', // m
    'application/javascript', // js
    'text/x-c', // c
    'text/x-c++', // cpp
    'text/x-java', // java
    
    // OpenDocument
    'application/vnd.oasis.opendocument.text', // odt
    'application/vnd.oasis.opendocument.spreadsheet', // ods
    'application/vnd.oasis.opendocument.presentation', // odp
    
    // Arquivos compactados
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    
    // SubRip Subtitle
    'application/x-subrip' // Adiciona suporte a .srt se desejar
  ];
  
  // Verificar também por extensão para casos onde o mimetype não é detectado corretamente
  const fileExt = file.originalname.toLowerCase().split('.').pop();
  const allowedExtensions = [
    // Documentos
    'pdf', 'docx', 'doc', 'pptx', 'ppt', 'odt', 'odp', 'ods',
    // Planilhas e dados
    'xlsx', 'xls', 'csv',
    // Texto e código
    'txt', 'tex', 'md', 'json', 'xml', 'yaml', 'yml',
    'py', 'r', 'm', 'ipynb', 'js', 'c', 'cpp', 'java', 'html', 'css',
    // Bibliografia
    'bib', 'ris',
    // Imagens
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'tif', 'tiff', 'bmp', 'svg',
    // Dados científicos
    'mat', 'h5', 'hdf5', 'nc', 'cdf',
    // Compactados
    'zip', 'rar', '7z',
    // SubRip Subtitle
    'srt'
  ];
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não suportado: ${file.mimetype || 'desconhecido'} (.${fileExt})`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Pré-processar arquivo
async function preprocessFile(req, res) {
  try {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        console.error('Erro no upload:', err);
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum arquivo enviado' 
        });
      }

      try {
        const { originalname, filename, path: filePath, mimetype, size } = req.file;
        
        console.log(`=== NOVO UPLOAD ===`);
        console.log(`Nome original: ${originalname}`);
        console.log(`Nome no servidor: ${filename}`);
        console.log(`Tipo MIME: ${mimetype}`);
        console.log(`Tamanho: ${size} bytes`);

        // VALIDAÇÃO: Verificar se o tipo de arquivo é suportado
        try {
          FileProcessingService.validateFileType(originalname, mimetype);
        } catch (validationError) {
          // Remover o arquivo que foi salvo temporariamente
          try {
            await fs.unlink(filePath);
          } catch (unlinkError) {
            console.error('Erro ao remover arquivo temporário:', unlinkError);
          }
          
          return res.status(400).json({
            success: false,
            message: validationError.message
          });
        }

        console.log('=== INICIANDO UPLOAD E PROCESSAMENTO ===');
        console.log('Arquivo recebido:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          filename: req.file.filename
        });

        // Verificar se o arquivo físico existe
        try {
          const stats = await fs.stat(req.file.path);
          console.log('Arquivo verificado no disco:', {
            size: stats.size,
            isFile: stats.isFile(),
            path: req.file.path
          });
        } catch (statError) {
          console.error('ERRO: Arquivo não encontrado no disco:', statError);
          return res.status(500).json({
            success: false,
            message: 'Arquivo não encontrado no disco'
          });
        }

        // CHAMADA EXPLÍCITA DO PROCESSAMENTO
        console.log('=== CHAMANDO FileProcessingService.processFile ===');
        console.log('Parâmetros:', {
          filePath: req.file.path,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype
        });

        const result = await FileProcessingService.processFile(
          req.file.path,
          req.file.originalname,
          req.file.mimetype
        );

        console.log('=== RESULTADO COMPLETO DO PROCESSAMENTO ===');
        console.log('Success:', result.success);
        if (result.success) {
          console.log('Content length:', result.content ? result.content.length : 0);
          console.log('Content preview (primeiros 300 chars):', result.content ? result.content.substring(0, 300) : 'VAZIO');
          console.log('Metadata completa:', JSON.stringify(result.metadata, null, 2));
          
          // VERIFICAÇÃO ESPECÍFICA PARA IMAGENS
          if (req.file.mimetype.startsWith('image/')) {
            console.log('=== VALIDAÇÃO ESPECÍFICA DE IMAGEM ===');
            try {
              const imageData = JSON.parse(result.content);
              console.log('JSON de imagem parseado com sucesso:', {
                type: imageData.type,
                originalName: imageData.originalName,
                mimeType: imageData.mimeType,
                hasBase64: !!imageData.base64,
                base64Length: imageData.base64 ? imageData.base64.length : 0,
                base64Preview: imageData.base64 ? imageData.base64.substring(0, 50) + '...' : 'VAZIO'
              });
            } catch (parseError) {
              console.error('ERRO CRÍTICO: Conteúdo da imagem não é JSON válido!');
              console.error('Erro de parse:', parseError.message);
              console.log('Conteúdo que falhou no parse:', result.content);
              
              // Se chegou aqui, o processamento falhou
              return res.status(500).json({
                success: false,
                message: 'Falha no processamento da imagem: conteúdo inválido gerado'
              });
            }
          }
        } else {
          console.error('ERRO: Processamento falhou');
          console.error('Erro retornado:', result.error);
          console.error('Metadata:', result.metadata);
        }

        if (!result.success) {
          // Limpar arquivo em caso de erro
          await fs.unlink(req.file.path).catch(console.error);
          return res.status(400).json({
            success: false,
            message: result.error || 'Falha no processamento do arquivo'
          });
        }

        // Salvar no banco de dados
        console.log('=== SALVANDO NO BANCO DE DADOS ===');
        const fileRecord = await File.create({
          originalName: req.file.originalname,
          fileName: req.file.filename,
          filePath: req.file.path,
          mimeType: req.file.mimetype,
          size: req.file.size,
          content: result.content,
          metadata: result.metadata,
          processedAt: new Date(),
          userId: req.user.id
        });

        console.log('=== ARQUIVO SALVO COM SUCESSO ===');
        console.log('ID do arquivo no banco:', fileRecord.id);
        console.log('Tamanho do conteúdo salvo:', fileRecord.content ? fileRecord.content.length : 0);
        
        // VERIFICAÇÃO FINAL
        if (req.file.mimetype.startsWith('image/') && fileRecord.content.length < 1000) {
          console.error('ALERTA: Imagem salva com conteúdo muito pequeno!');
          console.error('Conteúdo salvo:', fileRecord.content);
        }

        const icon = FileProcessingService.getFileIcon(req.file.mimetype);

        res.json({
          success: true,
          fileId: fileRecord.id,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          icon,
          preview: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
          processedAt: result.metadata.processedAt
        });

      } catch (processingError) {
        console.error('ERRO GERAL no processamento:', processingError);
        console.error('Stack trace:', processingError.stack);
        // Limpar arquivo em caso de erro
        await fs.unlink(req.file.path).catch(console.error);
        res.status(500).json({
          success: false,
          message: 'Erro interno ao processar arquivo: ' + processingError.message
        });
      }
    });
  } catch (error) {
    console.error('ERRO GERAL no upload:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor: ' + error.message
    });
  }
}

// Associar arquivo a uma mensagem
async function attachFileToMessage(req, res) {
  try {
    const { fileId } = req.body;
    const { messageId } = req.params;

    const file = await File.findOne({
      where: {
        id: fileId,
        userId: req.user.id
      }
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }

    // Associar arquivo à mensagem
    file.MessageId = messageId;
    await file.save();

    res.json({
      success: true,
      message: 'Arquivo associado à mensagem com sucesso'
    });

  } catch (error) {
    console.error('Erro ao associar arquivo à mensagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
}

// Baixar arquivo
async function downloadFile(req, res) {
  try {
    const { fileId } = req.params;

    const file = await File.findOne({
      where: {
        id: fileId,
        userId: req.user.id
      }
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }

    // Verificar se o arquivo físico existe
    try {
      await fs.access(file.filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Arquivo físico não encontrado'
      });
    }

    res.download(file.filePath, file.originalName);

  } catch (error) {
    console.error('Erro ao baixar arquivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
}

// Deletar arquivo
async function deleteFile(req, res) {
  try {
    const { fileId } = req.params;

    const file = await File.findOne({
      where: {
        id: fileId,
        userId: req.user.id
      }
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }

    // Remover arquivo físico
    await fs.unlink(file.filePath).catch(console.error);

    // Remover registro do banco
    await file.destroy();

    res.json({
      success: true,
      message: 'Arquivo removido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
}

// Função para reprocessar arquivo existente (DEBUG)
async function reprocessFile(req, res) {
  try {
    const { fileId } = req.params;

    const file = await File.findOne({
      where: {
        id: fileId,
        userId: req.user.id
      }
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }

    console.log('=== REPROCESSANDO ARQUIVO ===');
    console.log('Arquivo:', file.originalName);
    console.log('Caminho:', file.filePath);

    // Reprocessar o arquivo
    const result = await FileProcessingService.processFile(
      file.filePath,
      file.originalName,
      file.mimeType
    );

    if (result.success) {
      // Atualizar o conteúdo no banco
      await file.update({
        content: result.content,
        metadata: result.metadata,
        processedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Arquivo reprocessado com sucesso',
        contentLength: result.content.length,
        preview: result.content.substring(0, 200)
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Erro ao reprocessar arquivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
}

module.exports = {
  preprocessFile,
  attachFileToMessage,
  downloadFile,
  deleteFile,
  reprocessFile
};
