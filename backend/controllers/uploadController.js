const { Message, File, Chat } = require('../models');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const fsExists = util.promisify(fs.exists);

// Iniciar cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Função auxiliar para processar o conteúdo do arquivo
const processFileContent = async (file) => {
  let fileContent = null;
  let processingResult = {
    success: false,
    content: null,
    message: '',
    processed: false
  };

  try {
    // Para arquivos de texto simples
    if (file.mimetype === 'text/plain') {
      const buffer = await readFile(file.path);
      fileContent = buffer.toString('utf8');
      
      // Limitar tamanho do conteúdo para evitar problemas com tokens muito grandes
      if (fileContent && fileContent.length > 10000) {
        fileContent = fileContent.substring(0, 10000) + "... [conteúdo truncado devido ao tamanho]";
      }
      
      console.log(`Arquivo de texto processado: ${file.originalName} (${fileContent.length} caracteres)`);
      
      processingResult = {
        success: true,
        content: fileContent,
        message: `Conteúdo do arquivo "${file.originalName}":\n\n${fileContent}`,
        processed: true
      };
    } 
    // Para PDFs, tente usar a API de análise da OpenAI
    else if (file.mimetype === 'application/pdf') {
      try {
        console.log(`Tentando processar PDF via OpenAI: ${file.originalName}`);
        
        // Na versão atual da API OpenAI, precisamos fazer upload do arquivo primeiro
        const fileUpload = await openai.files.create({
          file: fs.createReadStream(file.path),
          purpose: 'assistants',
        });
        
        if (fileUpload && fileUpload.id) {
          console.log(`Arquivo enviado com sucesso para OpenAI, ID: ${fileUpload.id}`);
          
          processingResult = {
            success: true,
            content: `[PDF ID: ${fileUpload.id}]`,
            message: `O arquivo PDF "${file.originalName}" foi processado e está disponível para análise.`,
            processed: true,
            fileId: fileUpload.id
          };
        }
      } catch (pdfError) {
        console.error('Erro ao processar PDF:', pdfError);
        
        processingResult = {
          success: false,
          content: null,
          message: `Arquivo PDF "${file.originalName}" foi enviado, mas não pôde ser processado automaticamente devido a limitações técnicas. Por favor, descreva o conteúdo do documento ou faça perguntas específicas sobre ele.`,
          processed: false
        };
      }
    }
    // Para outros tipos de documentos, apenas informe que o arquivo foi recebido
    else {
      processingResult = {
        success: true,
        content: null,
        message: `Arquivo "${file.originalName}" (${file.mimetype}) foi recebido, mas o processamento automático não está disponível para este formato. Por favor, descreva o conteúdo do documento ou faça perguntas específicas sobre ele.`,
        processed: false
      };
    }
  } catch (processingError) {
    console.error('Erro ao processar conteúdo do arquivo:', processingError);
    
    processingResult = {
      success: false,
      content: null,
      message: `Ocorreu um erro ao processar o arquivo "${file.originalName}". O arquivo foi salvo, mas seu conteúdo não pôde ser extraído automaticamente.`,
      processed: false
    };
  }

  return processingResult;
};

// Pré-processar arquivo antes de enviar mensagem
exports.preprocessFile = async (req, res) => {
  try {
    // Log para debug
    console.log('Iniciando pré-processamento de arquivo');
    
    // Verificar se há arquivos no upload
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }
    
    console.log(`Arquivo recebido: ${req.file.originalname}, tipo: ${req.file.mimetype}`);
    
    // Salvar o arquivo temporariamente (já feito pelo multer)
    const file = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    // Verificar se o arquivo existe fisicamente no sistema
    const fileExists = await fsExists(file.path);
    if (!fileExists) {
      console.error(`Arquivo não encontrado no caminho: ${file.path}`);
      return res.status(500).json({ message: 'Erro ao processar arquivo: arquivo não encontrado no servidor' });
    }

    console.log('Arquivo encontrado, iniciando processamento de conteúdo');
    
    // Processar o conteúdo do arquivo
    const processingResult = await processFileContent(file);
    console.log('Processamento concluído:', processingResult.success ? 'Sucesso' : 'Falha');
    
    // Incluir informações do arquivo na resposta
    return res.status(200).json({
      message: 'Arquivo pré-processado com sucesso',
      file: {
        ...file,
        tempId: req.file.filename.split('-')[0] // Usar parte do nome como ID temporário
      },
      processing: processingResult
    });
  } catch (error) {
    console.error('Erro ao pré-processar arquivo:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Upload de arquivo para uma mensagem existente
exports.uploadFile = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Verificar se a mensagem existe
    const message = await Message.findByPk(messageId, {
      include: [{ model: Chat }]
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Mensagem não encontrada' });
    }
    
    // Verificar se o chat pertence ao usuário
    if (message.Chat.UserId !== req.user.id) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    
    // Verificar se há arquivos no upload
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }
    
    // Criar registro do arquivo
    const file = await File.create({
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      MessageId: messageId
    });

    // O arquivo já foi processado antes da mensagem ser enviada
    // Não precisamos criar uma mensagem do sistema aqui,
    // pois o conteúdo já foi incluído na mensagem do usuário
    
    return res.status(201).json({
      message: 'Arquivo enviado com sucesso',
      file
    });
  } catch (error) {
    console.error('Erro ao fazer upload de arquivo:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Excluir arquivo
exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Buscar o arquivo
    const file = await File.findByPk(fileId, {
      include: [{
        model: Message,
        include: [{ model: Chat }]
      }]
    });
    
    if (!file) {
      return res.status(404).json({ message: 'Arquivo não encontrado' });
    }
    
    // Verificar se o chat pertence ao usuário
    if (file.Message.Chat.UserId !== req.user.id) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    
    // Verificar se o arquivo existe antes de tentar excluí-lo
    if (fs.existsSync(file.path)) {
      // Excluir o arquivo do sistema de arquivos
      fs.unlink(file.path, async (err) => {
        if (err) {
          console.error('Erro ao excluir arquivo do disco:', err);
        }
        
        // Excluir o registro do banco de dados
        await file.destroy();
        
        return res.status(200).json({ message: 'Arquivo excluído com sucesso' });
      });
    } else {
      console.warn(`Arquivo não encontrado no disco: ${file.path}`);
      // Excluir apenas o registro do banco de dados
      await file.destroy();
      return res.status(200).json({ message: 'Registro do arquivo excluído com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};
