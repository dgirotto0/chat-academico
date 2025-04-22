const { Message, File, Chat } = require('../models');
const fs = require('fs');
const util = require('util');
const path = require('path');
const pdfParse = require('pdf-parse'); // Install via: npm install pdf-parse

const readFile = util.promisify(fs.readFile);
const fsExists = util.promisify(fs.exists);

// Iniciar cliente OpenAI (para outros usos se necessário)
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * processFileContent: extrai conteúdo de texto de arquivos
 * - Para text/plain: lê conteúdo diretamente
 * - Para application/pdf: usa pdf-parse para extrair texto
 * - Outros tipos: apenas registra recepção
 */
async function processFileContent(file) {
  let result = {
    success: false,
    content: null,
    message: '',
    processed: false,
    originalName: file.originalName
  };

  try {
    // Texto simples
    if (file.mimetype === 'text/plain') {
      const buffer = await readFile(file.path);
      let text = buffer.toString('utf8');
      if (text.length > 10000) {
        text = text.slice(0, 10000) + '... [truncated]';
      }
      console.log(`Texto de ${file.originalName} lido: ${text.length} chars`);
      result = {
        success: true,
        content: text,
        message: `Conteúdo de "${file.originalName}":\n\n${text}`,
        processed: true,
        originalName: file.originalName
      };
    }
    // PDF: extração local
    else if (file.mimetype === 'application/pdf') {
      console.log(`Extraindo PDF: ${file.originalName}`);
      const buffer = await readFile(file.path);
      const data = await pdfParse(buffer);
      let text = data.text || '';
      if (text.length > 10000) {
        text = text.slice(0, 10000) + '... [truncated]';
      }
      console.log(`PDF extraído (${file.originalName}): ${text.length} chars`);
      result = {
        success: true,
        content: text,
        message: `Conteúdo de "${file.originalName}":\n\n${text}`,
        processed: true,
        originalName: file.originalName
      };
    }
    // Outros tipos
    else {
      result = {
        success: true,
        content: null,
        message: `Arquivo "${file.originalName}" (${file.mimetype}) recebido. Descreva ou questione o conteúdo.`,
        processed: false,
        originalName: file.originalName
      };
    }
  } catch (err) {
    console.error('Erro processando arquivo:', err);
    result = {
      success: false,
      content: null,
      message: `Falha ao processar "${file.originalName}".`,
      processed: false,
      originalName: file.originalName
    };
  }

  return result;
}

// Exportar a função para uso em chatController
exports.processFileContent = processFileContent;

/**
 * Preprocessa arquivo antes de enviar mensagem
 */
exports.preprocessFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    const file = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    };
    const exists = await fsExists(file.path);
    if (!exists) return res.status(500).json({ message: 'Arquivo não encontrado no servidor' });

    const processing = await processFileContent(file);
    return res.status(200).json({
      message: 'Arquivo pré-processado com sucesso',
      file: { ...file, tempId: file.filename.split('-')[0] },
      processing
    });
  } catch (error) {
    console.error('Erro no pré-processamento:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

/**
 * Upload de arquivo vinculado a mensagem existente
 */
exports.uploadFile = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findByPk(messageId, { include: [Chat] });
    if (!message) return res.status(404).json({ message: 'Mensagem não encontrada' });
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    if (message.Chat.UserId !== req.user.id) return res.status(403).json({ message: 'Acesso negado' });

    const fileRecord = await File.create({
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      MessageId: messageId
    });

    const processing = await processFileContent({
      originalName: fileRecord.originalName,
      filename: fileRecord.filename,
      path: fileRecord.path,
      mimetype: fileRecord.mimetype,
      size: fileRecord.size
    });

    const systemMessage = await Message.create({
      content: processing.message,
      sender: 'system',
      ChatId: message.ChatId
    });

    return res.status(201).json({ message: 'Arquivo enviado com sucesso', file: fileRecord, systemMessage });
  } catch (error) {
    console.error('Erro ao enviar arquivo:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

/**
 * Excluir arquivo físico e registro
 */
exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findByPk(fileId, { include: [{ model: Message, include: [Chat] }] });
    if (!file) return res.status(404).json({ message: 'Arquivo não encontrado' });
    if (file.Message.Chat.UserId !== req.user.id) return res.status(403).json({ message: 'Acesso negado' });

    if (fs.existsSync(file.path)) {
      fs.unlink(file.path, async (err) => {
        if (err) console.error('Erro ao excluir do disco:', err);
        await file.destroy();
        return res.status(200).json({ message: 'Arquivo excluído com sucesso' });
      });
    } else {
      await file.destroy();
      return res.status(200).json({ message: 'Registro do arquivo excluído com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};
