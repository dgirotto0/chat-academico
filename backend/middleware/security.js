const { Chat, File, Message } = require('../models');

// Validar acesso ao chat
const validateChatAccess = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findOne({
      where: { id: chatId, UserId: userId }
    });

    if (!chat) {
      return res.status(403).json({ 
        message: 'Acesso negado: Chat não encontrado ou não pertence ao usuário' 
      });
    }

    req.chat = chat;
    next();
  } catch (error) {
    console.error('Erro na validação de acesso ao chat:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Validar acesso ao arquivo
const validateFileAccess = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const file = await File.findOne({
      where: { id: fileId, userId: userId }
    });

    if (!file) {
      return res.status(403).json({ 
        message: 'Acesso negado: Arquivo não encontrado ou não pertence ao usuário' 
      });
    }

    req.file = file;
    next();
  } catch (error) {
    console.error('Erro na validação de acesso ao arquivo:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Validar acesso à mensagem
const validateMessageAccess = async (req, res, next) => {
  try {
    const { messageId, chatId } = req.params;
    const userId = req.user.id;

    // Verificar se a mensagem pertence ao chat do usuário
    const message = await Message.findOne({
      where: { id: messageId },
      include: [{
        model: Chat,
        where: { UserId: userId }
      }]
    });

    if (!message) {
      return res.status(403).json({ 
        message: 'Acesso negado: Mensagem não encontrada ou acesso não autorizado' 
      });
    }

    req.message = message;
    next();
  } catch (error) {
    console.error('Erro na validação de acesso à mensagem:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

module.exports = {
  validateChatAccess,
  validateFileAccess,
  validateMessageAccess
};
