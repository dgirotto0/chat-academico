const { Chat, Message, File } = require('../models');
const { OpenAI } = require('openai');
const { processFileContent } = require('./uploadController'); // Add this import
const path = require('path');
const beabaResearch = require(path.join(__dirname, '../data/beabaResearch.json'));

// Função para buscar capítulos/subtópicos relevantes
function buscarContextoRelevante(pergunta) {
  const lowerPergunta = pergunta.toLowerCase();
  let contexto = [];

  // Busca por subtopic e chapterTitle que tenham relação com a pergunta
  for (const cap of Array.isArray(beabaResearch) ? beabaResearch : [beabaResearch]) {
    let capMatch = false;
    if (cap.chapterTitle && lowerPergunta.includes(cap.chapterTitle.toLowerCase())) {
      capMatch = true;
    }
    const subtopics = cap.subtopics || [];
    for (const sub of subtopics) {
      if (
        (sub.subtopic && lowerPergunta.includes(sub.subtopic.toLowerCase())) ||
        (sub.description && sub.description.toLowerCase().includes(lowerPergunta))
      ) {
        contexto.push({
          chapterTitle: cap.chapterTitle,
          subtopic: sub.subtopic,
          description: sub.description
        });
        capMatch = true;
      }
    }
    // Se não encontrou subtopic mas o capítulo bate, adiciona resumo do capítulo
    if (capMatch && contexto.length === 0) {
      contexto.push({
        chapterTitle: cap.chapterTitle,
        resumo: subtopics.map(s => s.subtopic).join(', ')
      });
    }
  }

  // Se nada encontrado, retorna vazio
  return contexto;
}

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
    const { content, preprocessed, fileId } = req.body;
    
    // Verificar se o chat existe e pertence ao usuário
    const chat = await Chat.findOne({
      where: { id: chatId, UserId: req.user.id }
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }
    
    // Salvar mensagem do usuário
    const userMessage = await Message.create({
      content: content || '',
      sender: 'user',
      ChatId: chatId
    });
    
    // Processar arquivo se existir
    let processedFileInfo = null;
    
    if (req.file) {
      // Salvar registro do arquivo
      const fileRecord = await File.create({
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        MessageId: userMessage.id
      });

      // Processar o arquivo sem criar uma mensagem de sistema visível
      const fileToProcess = {
        originalName: fileRecord.originalName,
        filename: fileRecord.filename,
        path: fileRecord.path,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size
      };

      processedFileInfo = await processFileContent(fileToProcess);
      console.log(`Arquivo processado para análise: ${fileRecord.originalName}, resultado: ${processedFileInfo.success ? 'Sucesso' : 'Falha'}`);
    }
    // Se é um arquivo pré-processado com fileId da OpenAI
    else if (preprocessed === 'true' && fileId) {
      processedFileInfo = {
        fileId: fileId,
        success: true,
        message: `Arquivo processado com ID: ${fileId}`,
        originalName: 'Arquivo PDF'
      };
      console.log(`Usando arquivo pré-processado com ID: ${fileId}`);
    }
    
    // Atualizar última atividade do chat
    chat.lastActivity = new Date();
    await chat.save();
    
    // Obter histórico de mensagens para contexto, incluindo arquivos
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
        content: msg.content || ''
      };
      
      // Se houver arquivos anexados e for uma mensagem do usuário, adicionar referência
      if (msg.Files && msg.Files.length > 0 && msg.sender === 'user') {
        const fileReferences = msg.Files.map(file => 
          `[Arquivo anexado: ${file.originalName}, tipo: ${file.mimetype}]`
        ).join('\n');
        
        formattedMsg.content = `${formattedMsg.content}\n\n${fileReferences}`;
      }
      
      return formattedMsg;
    });
    
    // === NOVO: Buscar contexto relevante do JSON ===
    let contextoIA = [];
    if (content && typeof content === 'string' && content.length > 10) {
      contextoIA = buscarContextoRelevante(content);
    }

    // Adicionar contexto do JSON como mensagem de sistema, se houver
    if (contextoIA.length > 0) {
      const contextoTexto = contextoIA.map(ctx =>
        `Capítulo: ${ctx.chapterTitle}\nTópico: ${ctx.subtopic || ''}\n${ctx.description || ctx.resumo || ''}`
      ).join('\n\n---\n\n');
      messages.unshift({
        role: 'system',
        content: `Considere o seguinte material de referência ao responder:\n${contextoTexto}\nSe for útil, utilize essas informações para aprimorar sua resposta.`
      });
    }

    // Se temos um arquivo processado, adicionar instrução específica para analisá-lo
    if (processedFileInfo && processedFileInfo.success) {
      // Se a mensagem do usuário está vazia, adicione um prompt padrão
      const userPrompt = content ? content : "Analise este arquivo para mim e forneça um resumo dos pontos principais.";
      
      // Se o arquivo é PDF, usar uma abordagem diferente já que não podemos usar file_ids diretamente
      if (processedFileInfo.fileId) {
        // Criar uma mensagem de sistema para o assistente saber sobre o arquivo
        messages.unshift({
          role: 'system',
          content: `O usuário enviou um arquivo "${processedFileInfo.originalName}" para análise. 
O arquivo foi processado, mas seu conteúdo não pode ser acessado diretamente pelo API.
Por favor, responda à pergunta do usuário "${userPrompt}" da melhor forma possível, 
informando que você precisaria de acesso ao conteúdo do arquivo para uma análise completa.`
        });
        
        // Não modifique a mensagem do usuário neste caso
      } else if (processedFileInfo.content) {
        // Se temos o conteúdo do arquivo (como para arquivos de texto), adicioná-lo diretamente
        messages.unshift({
          role: 'system',
          content: `O usuário enviou um arquivo "${processedFileInfo.originalName}" com o seguinte conteúdo:
          
${processedFileInfo.content}

Por favor, analise este conteúdo e responda à pergunta do usuário: "${userPrompt}".
Não mencione que você "vai analisar" ou "vai resumir". Simplesmente forneça sua análise diretamente.`
        });
      }
    }
    
    // Adicionar uma mensagem de sistema para contextualizar o assistente
    messages.unshift({
      role: 'system',
      content: `Você é um assistente de escrita especializado para pesquisadores acadêmicos. Seu papel é ajudar a construir melhores artigos científicos, aplicando técnicas avançadas de redação acadêmica.

Importante: Responda DIRETAMENTE com a análise ou resumo solicitado. NÃO use frases como "vou analisar" ou "vou fazer um resumo". Simplesmente forneça o conteúdo solicitado imediatamente.

Ao analisar um texto ou documento, você deve:
1. Oferecer sugestões práticas para melhorar a clareza e coesão
2. Propor ajustes na estrutura argumentativa quando necessário
3. Recomendar melhorias na formatação acadêmica (ABNT, APA, Vancouver, etc.)
4. Auxiliar na construção de referências bibliográficas
5. Identificar possíveis inconsistências metodológicas

Se o usuário enviar arquivos, analise seu conteúdo quando solicitado e ofereça feedback específico.

Mantenha suas respostas objetivas e baseadas em evidências.`
    });
    
    // Configurar opções para a API do OpenAI - REMOVER file_ids que não é suportado
    const openaiOptions = {
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 2000
    };
    
    // Remover a opção file_ids que estava causando o erro
    // NÃO ADICIONAR file_ids aqui
    
    console.log("Enviando requisição para OpenAI com opções:", JSON.stringify(openaiOptions, null, 2));
    
    // Obter resposta da API do OpenAI
    const completion = await openai.chat.completions.create(openaiOptions);
    
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

Importante: Responda DIRETAMENTE com a análise ou resumo solicitado. NÃO use frases como "vou analisar" ou "vou fazer um resumo". Simplesmente forneça o conteúdo solicitado imediatamente.

Ao analisar um texto ou documento, você deve:
1. Oferecer sugestões práticas para melhorar a clareza e coesão
2. Propor ajustes na estrutura argumentativa quando necessário
3. Recomendar melhorias na formatação acadêmica (ABNT, APA, Vancouver, etc.)
4. Auxiliar na construção de referências bibliográficas
5. Identificar possíveis inconsistências metodológicas

Se o usuário enviou arquivos, analise seu conteúdo quando solicitado e ofereça feedback específico.

Mantenha suas respostas objetivas, baseadas em evidências e focadas em transformar os textos em produções acadêmicas de alta qualidade.`
    });
    
    // Obter resposta da API do OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
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
