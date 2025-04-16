const { Chat, Message, File } = require('../models');
const { OpenAI } = require('openai');

// Iniciar cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Listar chats do usuário
exports.getUserChats = async (req, res) => {
  try {
    const chats = await Chat.findAll({
      where: { UserId: req.user.id },
      order: [['lastActivity', 'DESC']]
    });
    
    return res.status(200).json(chats);
  } catch (error) {
    console.error('Erro ao listar chats:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Criar novo chat
exports.createChat = async (req, res) => {
  try {
    const { title } = req.body;
    
    const newChat = await Chat.create({
      title: title || 'Nova Conversa',
      UserId: req.user.id
    });
    
    return res.status(201).json({
      message: 'Chat criado com sucesso',
      chat: newChat
    });
  } catch (error) {
    console.error('Erro ao criar chat:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Obter mensagens de um chat
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Verificar se o chat existe e pertence ao usuário
    const chat = await Chat.findOne({
      where: { id: chatId, UserId: req.user.id }
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }
    
    // Buscar mensagens do chat com arquivos anexados
    const messages = await Message.findAll({
      where: { ChatId: chatId },
      include: [File],
      order: [['createdAt', 'ASC']]
    });
    
    return res.status(200).json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Enviar mensagem e obter resposta da IA
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    
    // Verificar se o chat existe e pertence ao usuário
    const chat = await Chat.findOne({
      where: { id: chatId, UserId: req.user.id }
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }
    
    // Salvar mensagem do usuário
    const userMessage = await Message.create({
      content,
      sender: 'user',
      ChatId: chatId
    });
    
    // Atualizar última atividade do chat
    chat.lastActivity = new Date();
    await chat.save();
    
    // Obter histórico de mensagens para contexto, incluindo arquivos
    const chatHistory = await Message.findAll({
      where: { ChatId: chatId },
      include: [File],
      order: [['createdAt', 'ASC']],
      limit: 30 // Aumentado para 30 mensagens para melhor contexto
    });
    
    // Formatar mensagens para a API do OpenAI, incluindo informações sobre arquivos
    const messages = chatHistory.map(msg => {
      // Para mensagens do sistema (que contêm conteúdo de arquivos), usar o papel system
      if (msg.sender === 'system') {
        return {
          role: 'system',
          content: msg.content
        };
      }
      
      // Mensagem base para usuário ou assistente
      const formattedMsg = {
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      };
      
      // Se houver arquivos anexados e for uma mensagem do usuário, adicionar referência
      if (msg.Files && msg.Files.length > 0 && msg.sender === 'user') {
        // Adicionar informação sobre os arquivos no conteúdo da mensagem
        const fileReferences = msg.Files.map(file => 
          `[Arquivo anexado: ${file.originalName}, tipo: ${file.mimetype}]`
        ).join('\n');
        
        formattedMsg.content = `${formattedMsg.content}\n\n${fileReferences}`;
      }
      
      return formattedMsg;
    });
    
    // Adicionar uma mensagem de sistema para contextualizar o assistente com instrução mais detalhada
    messages.unshift({
      role: 'system',
      content: `Você é um assistente de escrita especializado para pesquisadores acadêmicos. Seu papel é ajudar a construir melhores artigos científicos, aplicando técnicas avançadas de redação acadêmica. 

Ao analisar um texto ou documento, você deve:
1. Oferecer sugestões práticas para melhorar a clareza e coesão
2. Propor ajustes na estrutura argumentativa quando necessário
3. Recomendar melhorias na formatação acadêmica (ABNT, APA, Vancouver, etc.)
4. Auxiliar na construção de referências bibliográficas
5. Identificar possíveis inconsistências metodológicas

Se o usuário enviar arquivos, analise seu conteúdo quando solicitado e ofereça feedback específico.

Mantenha suas respostas objetivas, baseadas em evidências e focadas em transformar os textos em produções acadêmicas de alta qualidade, não quebre suas respostas. Se o aluno solicitar outros tipos de assistência educacional, adapte-se para fornecer o suporte necessário.

Esta é a conversa atual com o usuário, use este contexto para personalizar suas respostas.`
    });
    
    // Obter resposta da API do OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 2000
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    // Salvar resposta da IA
    const assistantMessage = await Message.create({
      content: aiResponse,
      sender: 'assistant',
      ChatId: chatId
    });
    
    // Atualizar última atividade do chat novamente
    chat.lastActivity = new Date();
    await chat.save();
    
    return res.status(201).json({
      userMessage,
      assistantMessage,
      chat
    });
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Atualizar título do chat
exports.updateChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;
    
    // Verificar se o chat existe e pertence ao usuário
    const chat = await Chat.findOne({
      where: { id: chatId, UserId: req.user.id }
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }
    
    // Atualizar título
    chat.title = title;
    await chat.save();
    
    return res.status(200).json({
      message: 'Chat atualizado com sucesso',
      chat
    });
  } catch (error) {
    console.error('Erro ao atualizar chat:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Excluir chat
exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Verificar se o chat existe e pertence ao usuário
    const chat = await Chat.findOne({
      where: { id: chatId, UserId: req.user.id }
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }
    
    // Excluir chat (as mensagens e arquivos relacionados serão excluídos em cascata)
    await chat.destroy();
    
    return res.status(200).json({ message: 'Chat excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir chat:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Regenerar resposta para uma mensagem existente
exports.regenerateMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    
    // Verificar se o chat existe e pertence ao usuário
    const chat = await Chat.findOne({
      where: { id: chatId, UserId: req.user.id }
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }
    
    // Buscar a mensagem do usuário
    const userMessage = await Message.findOne({
      where: { id: messageId, ChatId: chatId, sender: 'user' }
    });
    
    if (!userMessage) {
      return res.status(404).json({ message: 'Mensagem do usuário não encontrada' });
    }
    
    // Obter histórico de mensagens para contexto, incluindo arquivos e mensagens do sistema
    const chatHistory = await Message.findAll({
      where: { ChatId: chatId },
      include: [File],
      order: [['createdAt', 'ASC']],
      limit: 30
    });
    
    // Formatar mensagens para a API do OpenAI
    const messages = chatHistory.map(msg => {
      // Para mensagens do sistema (que contêm conteúdo de arquivos), usar o papel system
      if (msg.sender === 'system') {
        return {
          role: 'system',
          content: msg.content
        };
      }
      
      // Mensagem base para usuário ou assistente
      const formattedMsg = {
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      };
      
      // Se houver arquivos anexados, adicionar referência
      if (msg.Files && msg.Files.length > 0 && msg.sender === 'user') {
        const fileReferences = msg.Files.map(file => 
          `[Arquivo anexado: ${file.originalName}, tipo: ${file.mimetype}]`
        ).join('\n');
        
        formattedMsg.content = `${formattedMsg.content}\n\n${fileReferences}`;
      }
      
      return formattedMsg;
    });
    
    // Adicionar uma mensagem de sistema para contextualizar o assistente
    messages.unshift({
      role: 'system',
      content: `Você é um assistente de escrita especializado para pesquisadores acadêmicos. Seu papel é ajudar a construir melhores artigos científicos, aplicando técnicas avançadas de redação acadêmica. 

Ao analisar um texto ou documento, você deve:
1. Oferecer sugestões práticas para melhorar a clareza e coesão
2. Propor ajustes na estrutura argumentativa quando necessário
3. Recomendar melhorias na formatação acadêmica (ABNT, APA, Vancouver, etc.)
4. Auxiliar na construção de referências bibliográficas
5. Identificar possíveis inconsistências metodológicas

Se o usuário enviou arquivos, analise seu conteúdo quando solicitado e ofereça feedback específico.

Mantenha suas respostas objetivas, baseadas em evidências e focadas em transformar os textos em produções acadêmicas de alta qualidade. Se o aluno solicitar outros tipos de assistência educacional, adapte-se para fornecer o suporte necessário.

Esta é uma solicitação para regenerar uma resposta. Revise cuidadosamente o contexto da conversa para oferecer uma resposta mais útil.`
    });
    
    // Obter resposta da API do OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 2000
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    // Salvar resposta da IA
    const assistantMessage = await Message.create({
      content: aiResponse,
      sender: 'assistant',
      ChatId: chatId
    });
    
    // Atualizar última atividade do chat
    chat.lastActivity = new Date();
    await chat.save();
    
    return res.status(201).json({
      message: 'Resposta regenerada com sucesso',
      assistantMessage
    });
  } catch (error) {
    console.error('Erro ao regenerar resposta:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};
