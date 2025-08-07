const { Chat, Message, File } = require('../models');
const { OpenAI } = require('openai');
const FileProcessingService = require('../services/fileProcessingService');
const FileGenerationService = require('../services/fileGenerationService');
const { processFileContent } = require('./uploadController'); // Add this import
const path = require('path');
const beabaResearch = require(path.join(__dirname, '../data/beabaResearch.json'));

const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

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
      where: { UserId: req.user.id }, // Corrigido: era UserId
      order: [['updatedAt', 'DESC']] // Corrigido: era lastActivity
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
    let { title } = req.body;

    // Garante que o título seja uma string, mesmo que venha aninhado em um objeto
    if (typeof title === 'object' && title !== null && title.title) {
      title = title.title;
    }
    
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
      where: { id: chatId, UserId: req.user.id } // Corrigido: era UserId
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }
    
    // Buscar mensagens do chat com arquivos anexados
    const messages = await Message.findAll({
      where: { ChatId: chatId }, // Corrigido: era ChatId
      include: [{
        model: File,
        required: false
      }],
      order: [['createdAt', 'ASC']]
    });

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Editar uma mensagem
exports.editMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const userMessage = await Message.findOne({
      where: { id: messageId, sender: 'user' }, // Só pode editar as próprias mensagens
      include: {
        model: Chat,
        where: { UserId: userId }
      }
    });

    if (!userMessage) {
      return res.status(404).json({ message: 'Mensagem não encontrada ou você não tem permissão para editá-la.' });
    }

    // 1. Atualiza a mensagem do usuário
    userMessage.content = content;
    await userMessage.save();

    // 2. Regenera a resposta do assistente
    // Encontrar a mensagem do assistente que se segue à do usuário
    const assistantMessage = await Message.findOne({
      where: {
        ChatId: chatId,
        sender: 'assistant',
        createdAt: {
          [require('sequelize').Op.gt]: userMessage.createdAt
        }
      },
      order: [['createdAt', 'ASC']]
    });

    // Se não houver uma mensagem de assistente a seguir, apenas retorne a mensagem do usuário atualizada.
    if (!assistantMessage) {
      return res.status(200).json({
        message: 'Mensagem atualizada com sucesso',
        updatedUserMessage: userMessage,
        updatedAssistantMessage: null
      });
    }

    // Obter contexto para a IA (incluindo a mensagem recém-editada)
    const messagesForContext = await Message.findAll({
      where: {
        ChatId: chatId,
        createdAt: { [require('sequelize').Op.lte]: userMessage.createdAt }
      },
      order: [['createdAt', 'ASC']],
      limit: 10
    });

    // Monta o histórico para o OpenAI, substituindo o conteúdo da mensagem editada
    const messages = [
      {
        role: 'system',
        content: `Você é um assistente de escrita especializado para pesquisadores acadêmicos. Seu papel é ajudar a construir melhores artigos científicos, aplicando técnicas avançadas de redação acadêmica.

Importante: Responda DIRETAMENTE com a análise ou resumo solicitado. NÃO use frases como "vou analisar" ou "vou fazer um resumo". Simplesmente forneça o conteúdo solicitado imediatamente.

**Geração de Arquivos:**
- **Regra de Ouro:** Você DEVE sempre gerar o conteúdo para o arquivo solicitado. NUNCA diga que não pode criar um arquivo (PDF, Excel, imagem, etc.). Apenas forneça o conteúdo no formato correto e o sistema fará a conversão.
- **Documentos (PDF, Word, Excel, CSV, TXT):** Se o usuário pedir um documento (ex: "crie um PDF com estes dados", "gere uma planilha com o resumo"), gere o conteúdo textual ou os dados estruturados para esse arquivo. Para tabelas, use o formato Markdown.
- **Gráficos:** Se o usuário pedir um gráfico (ex: "gere um gráfico de barras"), você DEVE fornecer a configuração completa em um bloco de código JSON compatível com Chart.js. Exemplo:
\`\`\`json
{
  "type": "bar",
  "data": { "labels": ["A", "B"], "datasets": [{"label": "Dados", "data": [10, 20]}] }
}
\`\`\`
- **Imagens (DALL-E):** Se o usuário pedir uma imagem ou ilustração, formule um prompt claro em inglês para o DALL-E e coloque-o na tag [PROMPT: ...]. Exemplo:
[PROMPT: An artistic illustration of a neuron firing, digital art]

**Análise de Texto:**
1. Oferecer sugestões práticas para melhorar a clareza e coesão.
2. Propor ajustes na estrutura argumentativa.
3. Recomendar melhorias na formatação acadêmica (ABNT, APA, etc.).

Se o usuário enviou arquivos, analise seu conteúdo quando solicitado. Mantenha suas respostas objetivas e baseadas em evidências.`
      },
      ...messagesForContext.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.id === userMessage.id ? content : msg.content // Usa o novo conteúdo editado
      }))
    ];

    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 16384
    });

    const aiResponseContent = openaiResponse.choices[0].message.content;

    // Refatorado: Delega a geração de arquivo para o serviço
    const generatedFile = await FileGenerationService.generateFileFromAIResponse(aiResponseContent, req.user.id);

    // Atualiza a mensagem do assistente com o novo conteúdo
    assistantMessage.content = aiResponseContent;
    assistantMessage.generatedFile = generatedFile;
    await assistantMessage.save();

    return res.status(200).json({
      message: 'Mensagem atualizada e resposta regenerada com sucesso',
      updatedUserMessage: userMessage,
      updatedAssistantMessage: assistantMessage
    });

  } catch (error) {
    console.error('Erro ao editar mensagem:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

// Enviar mensagem e obter resposta da IA
exports.sendMessage = async (req, res) => {
  try {
    let { chatId } = req.params;
    const { content, fileId } = req.body;
    const userId = req.user.id;

    // Se não há chatId, cria novo chat
    let chat;
    if (!chatId || chatId === 'null' || chatId === 'undefined') {
      chat = await Chat.create({
        title: content?.slice(0, 40) || 'Nova Conversa',
        UserId: userId
      });
      chatId = chat.id;
    } else {
      chat = await Chat.findOne({
        where: { id: chatId, UserId: userId }
      });
      if (!chat) {
        return res.status(404).json({ message: 'Chat não encontrado' });
      }
    }

    // Verificar se é a primeira mensagem do usuário no chat
    const messageCount = await Message.count({ where: { ChatId: chatId } });
    const isFirstMessage = messageCount === 0;

    let fileContent = '';
    let fileInfo = null;

    // Se há um arquivo anexado, buscar seu conteúdo
    if (fileId) {
      const file = await File.findOne({
        where: { id: fileId, userId: userId }
      });

      if (file) {
        fileContent = file.content || '';
        fileInfo = {
          id: file.id,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          icon: FileProcessingService.getFileIcon(file.mimeType)
        };
      }
    }

    // Criar mensagem do usuário
    const userMessage = await Message.create({
      ChatId: chatId,
      content,
      sender: 'user'
    });

    // Atualizar o arquivo com o ID da mensagem
    if (fileId && fileInfo) {
      await File.update(
        { MessageId: userMessage.id },  // Corrigido: MessageId com M maiúsculo
        { where: { id: fileId } }
      );
    }

    // Preparar contexto para IA
    let fullContent = content;
    if (fileContent) {
      fullContent += `\n\n[Arquivo anexado: ${fileInfo.originalName}, tipo: ${fileInfo.mimeType}]\n${fileContent}`;
    }

    // Buscar mensagens anteriores do chat
    const previousMessages = await Message.findAll({
      where: { ChatId: chatId },
      order: [['createdAt', 'ASC']],
      limit: 10
    });

    // Preparar histórico para OpenAI
    const messages = [
      {
        role: 'system',
        content: `Você é um assistente de escrita especializado para pesquisadores acadêmicos. Seu papel é ajudar a construir melhores artigos científicos, aplicando técnicas avançadas de redação acadêmica.

Importante: Responda DIRETAMENTE com a análise ou resumo solicitado. NÃO use frases como "vou analisar" ou "vou fazer um resumo". Simplesmente forneça o conteúdo solicitado imediatamente.

**Geração de Arquivos:**
- **Regra de Ouro:** Você DEVE sempre gerar o conteúdo para o arquivo solicitado. NUNCA diga que não pode criar um arquivo (PDF, Excel, imagem, etc.). Apenas forneça o conteúdo no formato correto e o sistema fará a conversão.
- **Documentos (PDF, Word, Excel, CSV, TXT):** Se o usuário pedir um documento (ex: "crie um PDF com estes dados", "gere uma planilha com o resumo"), gere o conteúdo textual ou os dados estruturados para esse arquivo. Para tabelas, use o formato Markdown.
- **Gráficos:** Se o usuário pedir um gráfico (ex: "gere um gráfico de barras"), você DEVE fornecer a configuração completa em um bloco de código JSON compatível com Chart.js. Exemplo:
\`\`\`json
{
  "type": "bar",
  "data": { "labels": ["A", "B"], "datasets": [{"label": "Dados", "data": [10, 20]}] }
}
\`\`\`
- **Imagens (DALL-E):** Se o usuário pedir uma imagem ou ilustração, formule um prompt claro em inglês para o DALL-E e coloque-o na tag [PROMPT: ...]. Exemplo:
[PROMPT: An artistic illustration of a neuron firing, digital art]

**Análise de Texto:**
1. Oferecer sugestões práticas para melhorar a clareza e coesão.
2. Propor ajustes na estrutura argumentativa.
3. Recomendar melhorias na formatação acadêmica (ABNT, APA, etc.).

Se o usuário enviou arquivos, analise seu conteúdo quando solicitado. Mantenha suas respostas objetivas e baseadas em evidências.`
      }
    ];

    // Adicionar mensagens anteriores (últimas 5)
    previousMessages.slice(-5).forEach(msg => {
      if (msg.id !== userMessage.id) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    });

    // Adicionar mensagem atual
    messages.push({
      role: 'user',
      content: fullContent
    });


    // Chamar OpenAI
    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 16384
    });

    const aiResponseContent = openaiResponse.choices[0].message.content;

    // Refatorado: Delega a geração de arquivo para o serviço
    const generatedFile = await FileGenerationService.generateFileFromAIResponse(aiResponseContent, req.user.id);

    // Criar mensagem de resposta da IA
    const aiMessage = await Message.create({
      ChatId: chatId,
      content: aiResponseContent,
      sender: 'assistant',
      generatedFile: generatedFile
    });

    // Se for a primeira mensagem, gerar e atualizar o título do chat
    if (isFirstMessage) {
      try {
        const titlePrompt = `Baseado na conversa abaixo, crie um título curto e descritivo com no máximo 5 palavras.

Usuário: "${content}"
Assistente: "${aiResponseContent}"

Título:`;

        const titleResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo', // Usar um modelo mais rápido e barato para o título
          messages: [{ role: 'user', content: titlePrompt }],
          max_tokens: 20,
          temperature: 0.5
        });

        const newTitle = titleResponse.choices[0].message.content.trim().replace(/"/g, '');
        await chat.update({ title: newTitle });
      } catch (titleError) {
        console.error('Erro ao gerar título do chat:', titleError);
        // Continua mesmo se a geração do título falhar, o título provisório será mantido.
      }
    }

    // Atualizar chat
    await chat.update({ updatedAt: new Date() });

    // Buscar os arquivos da mensagem do usuário para incluir na resposta
    const userMessageWithFiles = await Message.findByPk(userMessage.id, {
      include: [{
        model: File,
        required: false
      }]
    });

    // Retornar as mensagens
    res.status(201).json({
      userMessage: {
        id: userMessageWithFiles.id,
        content: userMessageWithFiles.content,
        sender: 'user',
        createdAt: userMessageWithFiles.createdAt,
        Files: userMessageWithFiles.Files || []
      },
      aiMessage: {
        id: aiMessage.id,
        content: aiMessage.content,
        sender: 'assistant',
        createdAt: aiMessage.createdAt,
        generatedFile: aiMessage.generatedFile
      },
      chat: chat // sempre retorna o chat (novo ou existente)
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Atualizar título do chat
exports.updateChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;
    
    const chat = await Chat.findOne({
      where: { id: chatId, UserId: req.user.id }
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }
    
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
    
    const chat = await Chat.findOne({
      where: { id: chatId, UserId: req.user.id }
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }
    
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

    const chat = await Chat.findOne({ where: { id: chatId, UserId: req.user.id } });
    if (!chat) return res.status(404).json({ message: 'Chat não encontrado' });

    // Encontrar a mensagem do usuário que originou o pedido
    const userMessage = await Message.findOne({
      where: { id: messageId, ChatId: chatId, sender: 'user' }
    });
    if (!userMessage) return res.status(404).json({ message: 'Mensagem do usuário não encontrada' });

    const messagesForContext = await Message.findAll({
      where: {
        ChatId: chatId,
        createdAt: { [require('sequelize').Op.lte]: userMessage.createdAt } // Pega todas as mensagens até a do usuário
      },
      order: [['createdAt', 'ASC']],
      limit: 10
    });

    const messages = [
      {
        role: 'system',
        content: `Você é um assistente de escrita especializado para pesquisadores acadêmicos. Seu papel é ajudar a construir melhores artigos científicos, aplicando técnicas avançadas de redação acadêmica.

Importante: Responda DIRETAMENTE com a análise ou resumo solicitado. NÃO use frases como "vou analisar" ou "vou fazer um resumo". Simplesmente forneça o conteúdo solicitado imediatamente.

**Geração de Arquivos:**
- **Regra de Ouro:** Você DEVE sempre gerar o conteúdo para o arquivo solicitado. NUNCA diga que não pode criar um arquivo (PDF, Excel, imagem, etc.). Apenas forneça o conteúdo no formato correto e o sistema fará a conversão.
- **Documentos (PDF, Word, Excel, CSV, TXT):** Se o usuário pedir um documento (ex: "crie um PDF com estes dados", "gere uma planilha com o resumo"), gere o conteúdo textual ou os dados estruturados para esse arquivo. Para tabelas, use o formato Markdown.
- **Gráficos:** Se o usuário pedir um gráfico (ex: "gere um gráfico de barras"), você DEVE fornecer a configuração completa em um bloco de código JSON compatível com Chart.js. Exemplo:
\`\`\`json
{
  "type": "bar",
  "data": { "labels": ["A", "B"], "datasets": [{"label": "Dados", "data": [10, 20]}] }
}
\`\`\`
- **Imagens (DALL-E):** Se o usuário pedir uma imagem ou ilustração, formule um prompt claro em inglês para o DALL-E e coloque-o na tag [PROMPT: ...]. Exemplo:
[PROMPT: An artistic illustration of a neuron firing, digital art]

**Análise de Texto:**
1. Oferecer sugestões práticas para melhorar a clareza e coesão.
2. Propor ajustes na estrutura argumentativa.
3. Recomendar melhorias na formatação acadêmica (ABNT, APA, etc.).

Se o usuário enviou arquivos, analise seu conteúdo quando solicitado. Mantenha suas respostas objetivas e baseadas em evidências.`
      },
      ...messagesForContext.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 16384
    });

    const aiResponseContent = openaiResponse.choices[0].message.content;

    // Refatorado: Delega a geração de arquivo para o serviço
    const generatedFile = await FileGenerationService.generateFileFromAIResponse(aiResponseContent, req.user.id);

    // Encontrar a mensagem do assistente que se segue à do usuário
    const originalAssistantMessage = await Message.findOne({
      where: {
        ChatId: chatId,
        sender: 'assistant',
        createdAt: {
          [require('sequelize').Op.gt]: userMessage.createdAt
        }
      },
      order: [['createdAt', 'ASC']]
    });

    if (!originalAssistantMessage) {
      return res.status(404).json({ message: 'Resposta do assistente para regenerar não encontrada.' });
    }

    // Atualizar a mensagem existente
    originalAssistantMessage.content = aiResponseContent;
    originalAssistantMessage.generatedFile = generatedFile;
    await originalAssistantMessage.save();

    return res.status(200).json({
      message: 'Resposta regenerada com sucesso',
      assistantMessage: originalAssistantMessage // Retorna a mensagem atualizada
    });

  } catch (error) {
    console.error('Erro ao regenerar resposta:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};
