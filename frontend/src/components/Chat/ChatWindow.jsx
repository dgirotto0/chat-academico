import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, Typography, TextField, IconButton, Paper,
  CircularProgress, Divider, Avatar, Grid, Tooltip,
  InputAdornment, Grow, Fade, Zoom, Skeleton, Chip,
  Card, CardContent, useTheme, Button
} from '@mui/material';
import { 
  Send, AttachFile, Description, PictureAsPdf, Image, 
  AudioFile, Delete, EmojiEmotions, AutoAwesome,
  MoreVert, Refresh, ContentCopy, Check, Edit, Save, Cancel, Download
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { chatApi, uploadApi, filesApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingButton from '../Common/LoadingButton';
import ConfirmDialog from '../Common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { marked } from 'marked';

// Configurar marked para processar markdown
marked.setOptions({
  breaks: true,
  gfm: true
});

// Função para processar markdown em html seguro
const renderMarkdown = (text) => {
  try {
    return { __html: marked(text) };
  } catch (error) {
    console.error('Erro ao processar markdown:', error);
    return { __html: text };
  }
};

const AssistantTypingIndicator = () => {
  const theme = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ width: '100%' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mx: { xs: 0, sm: 1 } }}>
        <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: theme.palette.primary.main }}>AI</Avatar>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Assistente
        </Typography>
      </Box>
      <Card
        elevation={0}
        sx={{
          p: 0,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          display: 'inline-block',
          minWidth: '80px',
        }}
      >
        <CardContent sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <motion.div
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            animate={{ y: [0, -4, 0] }}
            style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.palette.text.secondary, margin: '0 4px' }}
          />
          <motion.div
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.2 }}
            animate={{ y: [0, -4, 0] }}
            style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.palette.text.secondary, margin: '0 4px' }}
          />
          <motion.div
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.4 }}
            animate={{ y: [0, -4, 0] }}
            style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.palette.text.secondary, margin: '0 4px' }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ChatWindow = ({ chatId, onChatUpdated }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [messageToAction, setMessageToAction] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileProcessed, setFileProcessed] = useState(false);
  const [fileContent, setFileContent] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);  // Para acompanhar o progresso de processamento
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [downloadingFileId, setDownloadingFileId] = useState(null); // Novo estado para o download
  const endOfMessagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const { showError, showInfo, showWarning } = useNotification();
  const [creatingChat, setCreatingChat] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  // Animação para as mensagens
  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Criar uma versão memoizada da função fetchMessages com useCallback
  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    
    try {
      setLoading(true);
      const response = await chatApi.getChatMessages(chatId);
      // Reset messages completely instead of appending to prevent duplication
      setMessages(response.data);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setLoading(false);
    }
  }, [chatId, showError]);

  // Buscar mensagens quando o chatId mudar
  useEffect(() => {
    if (chatId) {
      // Não limpa as mensagens se já houver uma mensagem otimista (evita piscar)
      if (messages.length > 0 && messages.some(m => String(m.id).startsWith('temp-'))) {
        return;
      }
      setMessages([]); // Limpa mensagens antigas
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [chatId, fetchMessages]);

  // Rolar para o final das mensagens quando novas mensagens são carregadas
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    // Se não houver chatId, significa que é uma nova conversa.
    if (!chatId) {
      handleCreateChatAndSendMessage(e);
      return;
    }

    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage.trim(),
      sender: 'user',
      createdAt: new Date().toISOString(),
      Files: selectedFile ? [{
        id: `temp-file-${Date.now()}`,
        originalName: selectedFile.name,
        mimetype: selectedFile.type,
        size: selectedFile.size,
        filename: selectedFile.filename // se existir
      }] : [],
    };

    setMessages(prev => [...prev, tempUserMessage]);
    const messageToSend = newMessage.trim();
    const fileToSend = selectedFile;
    setNewMessage('');
    setSelectedFile(null);
    setFileProcessed(false);
    setFileContent(null);
    setIsAssistantTyping(true);

    try {
      setSendingMessage(true);
      const response = await chatApi.sendMessage(chatId, messageToSend, fileToSend?.preprocessed?.fileId ? fileToSend : null);
      let { userMessage, aiMessage } = response.data;

      // Corrige: sempre converte 'file' para 'Files' array
      if (userMessage.file) {
        userMessage.Files = [userMessage.file];
      }
      // Garante que Files seja array mesmo se vier vazio
      if (!userMessage.Files) {
        userMessage.Files = [];
      }

      setMessages(prev => {
        // Remove mensagem temporária
        const newMessages = prev.filter(msg => !String(msg.id).startsWith('temp-'));
        // Adiciona a mensagem do usuário e do assistente
        return [...newMessages, userMessage, aiMessage];
      });

      if (onChatUpdated) {
        onChatUpdated();
      }
    } catch (error) {
      showError('Erro ao enviar mensagem. Tente novamente.');
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
    } finally {
      setSendingMessage(false);
      setIsAssistantTyping(false);
    }
  };

  const handleEditMessage = (message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    try {
      setRegenerating(true);

      const response = await chatApi.editMessage(chatId, editingMessageId, editingContent.trim());
      const { updatedUserMessage, updatedAssistantMessage } = response.data;

      setMessages(prev => {
        const newMessages = [...prev];
        const userMessageIndex = newMessages.findIndex(msg => msg.id === editingMessageId);
        
        if (userMessageIndex !== -1) {
          // Atualiza a mensagem do usuário
          newMessages[userMessageIndex] = updatedUserMessage;

          // Se uma resposta do assistente foi regenerada, atualiza-a também
          if (updatedAssistantMessage) {
            const assistantMessageIndex = newMessages.findIndex(msg => msg.id === updatedAssistantMessage.id);
            if (assistantMessageIndex !== -1) {
              newMessages[assistantMessageIndex] = updatedAssistantMessage;
            }
          }
        }
        return newMessages;
      });
      
      handleCancelEdit();

    } catch (error) {
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateResponse = async (messageId) => {
    try {
      setRegenerating(true);
      
      // Encontrar o índice da mensagem do assistente que queremos regenerar
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        return;
      }
      
      // Encontrar a mensagem do usuário que gerou esta resposta (mensagem anterior)
      if (messageIndex === 0 || messages[messageIndex - 1].sender !== 'user') {
        return;
      }
      
      const userMessageId = messages[messageIndex - 1].id;
      
      // Solicitar uma nova resposta baseada na mesma pergunta
      const response = await chatApi.regenerateMessage(chatId, userMessageId);
      
      // Atualizar as mensagens na lista
      setMessages(prev => {
        const newMessages = [...prev];
        // Substituir a resposta existente
        newMessages[messageIndex] = response.data.assistantMessage;
        return newMessages;
      });
      
    } catch (error) {
      console.error('Erro ao regenerar resposta:', error);
      showError('Não foi possível regenerar a resposta. Tente novamente.');
    } finally {
      setRegenerating(false);
      setMessageToAction(null);
    }
  };

  // Simular progresso de processamento do arquivo
  useEffect(() => {
    let progressInterval;
    if (fileProcessing) {
      setProcessingProgress(0);
      progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          // Simula progresso gradual até 90% (os últimos 10% são quando realmente termina)
          if (prev < 90) {
            return prev + (Math.random() * 5);
          }
          return prev;
        });
      }, 300);
    } else if (fileProcessed) {
      setProcessingProgress(100);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [fileProcessing, fileProcessed]);

  const handleFileSelect = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (file.size > maxSize) {
        showError('O arquivo é muito grande. O tamanho máximo permitido é 10MB.');
        return;
      }
      
      setSelectedFile(file);
      setFileProcessing(true);
      setFileProcessed(false);
      setProcessingProgress(0);
      
      try {
        const response = await uploadApi.preprocessFile(file);
        if (response.data.success) {
          file.preprocessed = {
            success: true,
            fileId: response.data.fileId
          };
          setFileProcessed(true);
          setFileContent(response.data);
        } else {
          file.preprocessed = { success: false };
          setFileProcessed(true);
          setFileContent({ success: false });
          showWarning(`Arquivo anexado e pronto para envio`);
        }
        setSelectedFile(file);
      } catch (error) {
        setFileProcessed(true);
        setFileContent({ success: false });
      } finally {
        setFileProcessing(false);
        setProcessingProgress(100);
      }
    }
  };

  const handleFileClick = () => {
    fileInputRef.current.click();
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    setFileProcessed(false);
    setFileContent(null);
    showInfo('Seleção de arquivo cancelada');
  };

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getFileIcon = (mimetype) => {
    if (!mimetype) return <Description color="info" />;
    if (mimetype.startsWith('image/')) return <Image color="primary" />;
    if (mimetype === 'application/pdf') return <PictureAsPdf color="error" />;
    if (mimetype.startsWith('audio/')) return <AudioFile color="secondary" />;
    if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return <AutoAwesome color="success" />; // Ícone para planilhas
    if (mimetype.includes('csv')) return <AutoAwesome color="success" />;
    return <Description color="info" />;
  };

  // Abrir o diálogo de confirmação para exclusão de arquivo
  const handleDeleteFileClick = (file) => {
    setFileToDelete(file);
    setConfirmOpen(true);
  };

  // Excluir arquivo após confirmação
  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    
    try {
      setDeleting(true);
      await uploadApi.deleteFile(fileToDelete.id);
      await fetchMessages();
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error);
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setFileToDelete(null);
    }
  };

  // Copiar texto da mensagem
  const handleCopyMessage = (messageId, content) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
      })
      .catch(() => {
      });
    setMessageToAction(null);
  };

  // Formatar data da mensagem
  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Preview de arquivo selecionado com barra de progresso
  const renderFilePreview = () => {
    if (!selectedFile) return null;
    
    return (
      <Grow in={true}>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            mb: 2, 
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: 2,
            bgcolor: fileProcessed ? 'rgba(46, 125, 50, 0.1)' : 'action.hover',
            position: 'relative',
            overflow: 'hidden',
            width: '100%' // Garante que o preview ocupe a largura do container
          }}
        >
          {/* Barra de progresso do processamento */}
          <Box 
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '4px',
              width: `${processingProgress}%`,
              bgcolor: fileProcessed ? 'success.main' : 'primary.main',
              transition: 'width 0.5s ease'
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, overflow: 'hidden' }}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'background.paper', mr: 2 }}>
                {getFileIcon(selectedFile.type)}
              </Box>
              <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <Typography variant="body1" sx={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type.split('/')[1]}
                </Typography>
              </Box>
            </Box>
            
            <IconButton 
              onClick={handleCancelFile}
              color="error"
              aria-label="Remover arquivo selecionado"
              disabled={fileProcessing}
              sx={{ ml: 2 }}
            >
              <Delete />
            </IconButton>
          </Box>

          {/* Status do processamento */}
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
            {fileProcessing ? (
              <>
                <CircularProgress size={16} thickness={5} sx={{ mr: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Processando arquivo... {Math.min(Math.round(processingProgress), 99)}%
                </Typography>
              </>
            ) : fileProcessed && fileContent?.success ? (
              <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                <Check fontSize="small" sx={{ mr: 0.5 }} /> 
                Arquivo pronto para envio
              </Typography>
            ) : (
              <Typography variant="caption" color="warning.main">
                Arquivo anexado, pronto para envio
              </Typography>
            )}
          </Box>
        </Paper>
      </Grow>
    );
  };

  // Nova função para criar chat e enviar primeira mensagem
  const handleCreateChatAndSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage.trim(),
      sender: 'user',
      createdAt: new Date().toISOString(),
      Files: selectedFile ? [{
        id: `temp-file-${Date.now()}`,
        originalName: selectedFile.name,
        mimetype: selectedFile.type,
        size: selectedFile.size,
      }] : [],
    };
    
    const messageToSend = newMessage.trim();
    const fileToSend = selectedFile;
    const title = messageToSend.slice(0, 40) || 'Nova Conversa';

    setNewMessage('');
    setSelectedFile(null);
    setFileProcessed(false);
    setFileContent(null);
    setCreatingChat(true); // Para desabilitar o botão
    setIsAssistantTyping(true);

    try {
      const chatRes = await chatApi.createChat({ title });
      const newChatId = chatRes.data.chat.id;
      
      // Atualiza a UI para refletir o novo chat e a mensagem otimista
      if (onChatUpdated) {
        onChatUpdated(newChatId, false, [tempUserMessage]);
      }
      setMessages([tempUserMessage]);


      const response = await chatApi.sendMessage(newChatId, messageToSend, fileToSend?.preprocessed?.fileId ? fileToSend : null);
      const { userMessage, aiMessage } = response.data;

      // Atualiza a lista de mensagens com os dados reais do servidor
      setMessages(prev => {
        const newMessages = prev.filter(msg => msg.id !== tempUserMessage.id);
        return [...newMessages, userMessage, aiMessage];
      });

      // Força a atualização da lista de chats para pegar o título gerado pela IA
      if (onChatUpdated) {
        onChatUpdated(newChatId, true);
      }

    } catch (error) {
      // Remove a mensagem otimista em caso de erro
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
    } finally {
      setCreatingChat(false);
      setIsAssistantTyping(false);
    }
  };

  const handleDownloadGeneratedFile = async (file) => {
    setDownloadingFileId(file.filename);
    try {
      const response = await filesApi.downloadGeneratedFile(file.filename);
      
      // Cria um link temporário para iniciar o download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.originalName); // Usa o nome original do arquivo
      document.body.appendChild(link);
      link.click();
      
      // Limpa o link e o objeto URL
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Erro ao baixar o arquivo:', error);
      showError('Não foi possível baixar o arquivo. Tente novamente.');
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Quando não tem chat selecionado
  if (!chatId) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'flex-start',
          height: '100%',
          width: '100%',
          bgcolor: theme.palette.background.default,
          p: { xs: 2, md: 4 }
        }}
      >
        <Box sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 700,
          mx: 'auto'
        }}>
          <Fade in={true} timeout={1000}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <AutoAwesome sx={{ fontSize: 60, color: theme.palette.primary.main, mb: 2 }} />
              <Typography variant="h2" color="primary" fontWeight="bold" gutterBottom>
                Scientifique AI
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Como posso te ajudar hoje?
              </Typography>
            </Box>
          </Fade>
          {/* Campo de mensagem e botão de envio sempre visíveis */}
          <Box
            component="form"
            onSubmit={handleCreateChatAndSendMessage}
            sx={{
              width: '100%',
              maxWidth: 700,
              mt: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {renderFilePreview()}
            <Box sx={{ display: 'flex', width: '100%' }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                aria-label="Selecionar arquivo para upload"
              />
              <Tooltip title="Anexar arquivo" arrow>
                <span>
                  <IconButton
                    onClick={handleFileClick}
                    disabled={creatingChat || uploading || sendingMessage || fileProcessing}
                    color="primary"
                    aria-label="Anexar arquivo"
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                  >
                    <AttachFile />
                  </IconButton>
                </span>
              </Tooltip>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Digite sua mensagem para iniciar a conversa..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={creatingChat || uploading || sendingMessage || fileProcessing}
                multiline
                maxRows={4}
                sx={{
                  mx: 1,
                  '.MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: 'background.default',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    }
                  }
                }}
                InputProps={{
                  sx: { py: 1, px: 2 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Emojis" arrow>
                        <IconButton
                          edge="end"
                          aria-label="Inserir emoji"
                          size="small"
                          sx={{ mr: 0.5 }}
                          color="primary"
                        >
                          <EmojiEmotions fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
                aria-label="Campo de mensagem"
              />
              <LoadingButton
                variant="contained"
                color="primary"
                type="submit"
                disabled={(!newMessage.trim() && !selectedFile) || creatingChat || uploading || sendingMessage || fileProcessing}
                loading={creatingChat || sendingMessage || fileProcessing}
                loadingPosition="center"
                sx={{
                  minWidth: 100,
                  borderRadius: 3,
                  px: 3
                }}
                aria-label="Enviar mensagem"
              >
                Enviar
              </LoadingButton>
            </Box>
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: 2
            }}>
              <Typography
                variant="caption"
                color="text.secondary"
                align="center"
                sx={{ maxWidth: 500 }}
              >
                Este é um assistente de IA, suas respostas podem apresentar imprecisões.
                Verifique sempre informações importantes com fontes confiáveis.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      width: '100%',
      bgcolor: theme.palette.background.default
    }}>
      {/* Área de mensagens */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        p: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <Box sx={{ width: '100%', maxWidth: '850px' }}>
          {loading && messages.length === 0 ? (
            // Esqueletos para carregamento
            Array.from(new Array(3)).map((_, index) => (
              <Box key={index} sx={{ mb: 4, opacity: 1 - index * 0.2 }}>
                <Box sx={{ display: 'flex', mb: 1 }}>
                  <Skeleton variant="circular" width={32} height={32} sx={{ mr: 1 }} />
                  <Skeleton variant="text" width={100} />
                </Box>
                <Skeleton variant="rounded" height={80} sx={{ ml: 5, borderRadius: 2 }} />
              </Box>
            ))
          ) : (
            messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial="hidden"
                animate="visible"
                variants={messageVariants}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                style={{ width: '100%' }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    mb: 4,
                    position: 'relative',
                    mx: 'auto'
                  }}
                  onMouseEnter={() => message.sender === 'user' && setHoveredMessageId(message.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  {/* Cabeçalho da mensagem com avatar e nome */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1,
                    mx: { xs: 0, sm: 1 }
                  }}>
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        mr: 1,
                        bgcolor: message.sender === 'assistant' 
                          ? theme.palette.primary.main 
                          : theme.palette.secondary.main
                      }}
                      aria-label={message.sender === 'assistant' ? "Avatar do assistente" : "Avatar do usuário"}
                    >
                      {message.sender === 'assistant' ? 'AI' : user?.name?.charAt(0) || 'U'}
                    </Avatar>
                    <Typography 
                      variant="subtitle2" 
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      {message.sender === 'assistant' ? 'Assistente' : user?.name || 'Você'}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      {formatMessageTime(message.createdAt)}
                    </Typography>
                    
                    {/* Menu de ações */}
                    {message.sender === 'user' && hoveredMessageId === message.id && !editingMessageId && (
                      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                        <Tooltip title="Editar mensagem">
                          <IconButton size="small" onClick={() => handleEditMessage(message)} sx={{ mr: 0.5 }}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copiar texto">
                          <IconButton size="small" onClick={() => handleCopyMessage(message.id, message.content)}>
                            {copiedMessageId === message.id ? <Check fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {message.sender === 'assistant' && (
                      <Box sx={{ ml: 'auto' }}>
                        <Tooltip title="Opções">
                          <IconButton
                            size="small"
                            onClick={() => setMessageToAction(messageToAction === message.id ? null : message.id)}
                            aria-label="Opções da mensagem"
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {/* Menu de ações em popover */}
                        {messageToAction === message.id && (
                          <Card sx={{ 
                            position: 'absolute', 
                            right: 0, 
                            top: 32, 
                            zIndex: 10,
                            width: 200,
                            boxShadow: 3,
                            borderRadius: 2
                          }}>
                            <CardContent sx={{ p: 1 }}>
                              <Box 
                                sx={{ 
                                  p: 1, 
                                  borderRadius: 1,
                                  '&:hover': { bgcolor: 'action.hover' },
                                  display: 'flex',
                                  alignItems: 'center',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleCopyMessage(message.id, message.content)}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                                ) : (
                                  <ContentCopy fontSize="small" sx={{ mr: 1 }} />
                                )}
                                <Typography variant="body2">
                                  {copiedMessageId === message.id ? 'Copiado!' : 'Copiar texto'}
                                </Typography>
                              </Box>
                              <Box 
                                sx={{ 
                                  p: 1, 
                                  borderRadius: 1,
                                  '&:hover': { bgcolor: 'action.hover' },
                                  display: 'flex',
                                  alignItems: 'center',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleRegenerateResponse(message.id)}
                              >
                                <Refresh fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="body2">
                                  Regenerar resposta
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        )}
                      </Box>
                    )}
                  </Box>

                  {/* Conteúdo da mensagem */}
                  <Box>
                    <Card
                      elevation={0}
                      sx={{
                        p: 0,
                        borderRadius: 2,
                        bgcolor: message.sender === 'assistant' 
                          ? 'background.paper' 
                          : 'action.hover',
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        position: 'relative'
                      }}
                    >
                      {/* Indicador de regeneração */}
                      {(regenerating && (messageToAction === message.id || editingMessageId === messages[index - 1]?.id)) && (
                        <Box sx={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          right: 0, 
                          bottom: 0, 
                          bgcolor: 'rgba(255,255,255,0.7)', 
                          zIndex: 5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column'
                        }}>
                          <CircularProgress size={30} />
                          <Typography variant="caption" sx={{ mt: 1 }}>
                            Regenerando resposta...
                          </Typography>
                        </Box>
                      )}
                      
                      <CardContent sx={{ p: editingMessageId === message.id ? 2 : 3 }}>
                        {editingMessageId === message.id ? (
                          <Box>
                            <TextField
                              fullWidth
                              multiline
                              variant="outlined"
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              autoFocus
                              sx={{ mb: 1 }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                              <Button onClick={handleCancelEdit} size="small">Cancelar</Button>
                              <Button onClick={handleSaveEdit} variant="contained" size="small" startIcon={<Save />}>
                                Salvar
                              </Button>
                            </Box>
                          </Box>
                        ) : message.sender === 'assistant' ? (
                          <Box
                            sx={{
                              color: 'text.primary',
                              '& a': {
                                color: 'primary.main',
                                textDecoration: 'none',
                                '&:hover': {
                                  textDecoration: 'underline'
                                }
                              },
                              '& pre': {
                                bgcolor: 'action.hover',
                                p: 2,
                                borderRadius: 1,
                                overflowX: 'auto',
                                fontSize: '0.875rem'
                              },
                              '& code': {
                                bgcolor: 'action.hover',
                                p: 0.5,
                                borderRadius: 1,
                                fontSize: '0.875rem'
                              },
                              '& h1, & h2, & h3, & h4': {
                                mt: 2,
                                mb: 1,
                                fontWeight: 600,
                                lineHeight: 1.2
                              },
                              '& ul, & ol': {
                                pl: 3
                              },
                              '& blockquote': {
                                borderLeft: '4px solid',
                                borderColor: 'primary.light',
                                pl: 2,
                                ml: 0,
                                color: 'text.secondary'
                              }
                            }}
                            dangerouslySetInnerHTML={renderMarkdown(message.content)}
                          />
                        ) : message.sender === 'system' ? (
                          // Renderizar mensagens do sistema (conteúdo de arquivos) de forma especial
                          <Box
                            sx={{
                              bgcolor: 'info.light',
                              color: 'info.contrastText',
                              p: 2,
                              borderRadius: 1,
                              fontSize: '0.9rem',
                              '& pre': {
                                bgcolor: 'rgba(255,255,255,0.2)',
                                p: 2,
                                borderRadius: 1,
                                overflowX: 'auto',
                                fontSize: '0.875rem'
                              }
                            }}
                          >
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                              {message.content}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'break-word'
                            }}
                          >
                            {message.content}
                          </Typography>
                        )}
                        
                        {/* Arquivos anexados pelo usuário */}
                        {message.Files && message.Files.length > 0 && (
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" sx={{ display: 'block', mb: 1 }}>
                              Arquivos anexados:
                            </Typography>
                            <Grid container spacing={1}>
                              {message.Files.map((file) => (
                                <Grid item key={file.id}>
                                  <Zoom in={true} style={{ transitionDelay: '150ms' }}>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        p: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                          boxShadow: 1
                                        }
                                      }}
                                    >
                                      {getFileIcon(file.mimetype)}
                                      <Box sx={{ ml: 1, mr: 1 }}>
                                        <Typography variant="caption" sx={{ display: 'block' }}>
                                          {file.originalName.length > 15 
                                            ? file.originalName.substring(0, 15) + '...' 
                                            : file.originalName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {(file.size / 1024).toFixed(1)} KB
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex' }}>
                                        <Tooltip title="Baixar arquivo" arrow>
                                          <IconButton 
                                            size="small"
                                            component="a"
                                            href={`/uploads/${file.filename}`}
                                            target="_blank"
                                            download
                                            aria-label={`Baixar arquivo ${file.originalName}`}
                                          >
                                            <AttachFile fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                        {message.sender === 'user' && (
                                          <Tooltip title="Excluir arquivo" arrow>
                                            <IconButton 
                                              size="small"
                                              onClick={() => handleDeleteFileClick(file)}
                                              color="error"
                                              aria-label={`Excluir arquivo ${file.originalName}`}
                                            >
                                              <Delete fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        )}
                                      </Box>
                                    </Box>
                                  </Zoom>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        )}

                        {/* Arquivo gerado pela IA */}
                        {message.generatedFile && (
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" sx={{ display: 'block', mb: 1 }}>
                              Arquivo gerado:
                            </Typography>
                            <Zoom in={true}>
                              <Paper 
                                variant="outlined"
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  p: 1.5,
                                  borderRadius: 2,
                                  bgcolor: 'background.default',
                                  maxWidth: 350
                                }}
                              >
                                {getFileIcon(message.generatedFile.mimeType)}
                                <Box sx={{ ml: 1.5, mr: 1.5, overflow: 'hidden' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {message.generatedFile.originalName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {message.generatedFile.mimeType}
                                  </Typography>
                                </Box>
                                <Tooltip title="Baixar arquivo" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownloadGeneratedFile(message.generatedFile)}
                                    disabled={downloadingFileId === message.generatedFile.filename}
                                    sx={{ ml: 'auto' }}
                                  >
                                    {downloadingFileId === message.generatedFile.filename ? (
                                      <CircularProgress size={20} />
                                    ) : (
                                      <Download />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </Paper>
                            </Zoom>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                </Box>
              </motion.div>
            ))
          )}
          <div ref={endOfMessagesRef} />

          {isAssistantTyping && <AssistantTypingIndicator />}

          {loading && messages.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>
      </Box>

      {/* Área de input */}
      <Box 
        sx={{ 
          p: { xs: 2, md: 3 }, 
          pt: 2,
          borderTop: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <Box 
          component="form" 
          onSubmit={handleSendMessage}
          sx={{ width: '100%', maxWidth: '850px' }}
        >
          {/* Preview de arquivo selecionado */}
          {renderFilePreview()}
          
          <Box sx={{ display: 'flex' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              aria-label="Selecionar arquivo para upload"
            />
            <Tooltip title="Anexar arquivo" arrow>
              <span> {/* Wrapper necessário para o Tooltip funcionar com botão desabilitado */}
                <IconButton 
                  onClick={handleFileClick}
                  disabled={loading || uploading || sendingMessage || fileProcessing}
                  color="primary"
                  aria-label="Anexar arquivo"
                  sx={{ 
                    width: 48, 
                    height: 48, 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                >
                  <AttachFile />
                </IconButton>
              </span>
            </Tooltip>
            
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={loading || uploading || sendingMessage || fileProcessing}
              multiline
              maxRows={4}
              sx={{ 
                mx: 1,
                '.MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: 'background.default',
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  }
                }
              }}
              InputProps={{
                sx: { py: 1, px: 2 },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Emojis" arrow>
                      <IconButton 
                        edge="end"
                        aria-label="Inserir emoji"
                        size="small"
                        sx={{ mr: 0.5 }}
                        color="primary"
                      >
                        <EmojiEmotions fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                )
              }}
              aria-label="Campo de mensagem"
            />
            
            <LoadingButton
              variant="contained"
              color="primary"
              type="submit"
              disabled={(!newMessage.trim() && !selectedFile) || loading || uploading || sendingMessage || fileProcessing}
              loading={sendingMessage || uploading || fileProcessing}
              loadingPosition="center"
              sx={{ 
                minWidth: 100,
                borderRadius: 3,
                px: 3
              }}
              aria-label="Enviar mensagem"
            >
              Enviar
            </LoadingButton>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mt: 2
          }}>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              align="center" 
              sx={{ maxWidth: 500 }}
            >
              Este é um assistente de IA, suas respostas podem apresentar imprecisões. 
              Verifique sempre informações importantes com fontes confiáveis.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Diálogo de confirmação para exclusão de arquivo */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteFile}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja excluir o arquivo "${fileToDelete?.originalName}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="warning"
        loading={deleting}
      />
    </Box>
  );
};

export default ChatWindow;
