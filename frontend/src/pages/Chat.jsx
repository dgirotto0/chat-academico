import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Layout/Header';
import ChatList from '../components/Chat/ChatList';
import ChatWindow from '../components/Chat/ChatWindow';
import { chatApi } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

const Chat = () => {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingChatId, setPendingChatId] = useState(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const { showError } = useNotification();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await chatApi.getChats();
      const chatsData = Array.isArray(response.data)
        ? response.data.filter(chat => chat && typeof chat === 'object' && chat.id)
        : [];
      setChats(chatsData);

      if (chatsData.length > 0 && !selectedChatId) {
        setSelectedChatId(chatsData[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar chats:', error);
      setChats([]);
      showError('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const handleChatSelect = (chatId) => {
    setSelectedChatId(chatId);
    if (isMobile) setSidebarOpen(false);
  };

  const handleChatUpdated = (newChatId, forceReload, optimisticMessages) => {
    // Se for uma nova conversa com mensagens otimistas
    if (newChatId && optimisticMessages) {
      setSelectedChatId(newChatId);
      // A ChatWindow irá lidar com as mensagens otimistas
    } else if (forceReload) {
      fetchChats().then(() => {
        if (newChatId) {
          setSelectedChatId(newChatId);
        }
      });
    } else {
      fetchChats();
    }
  };

  const handleNewChat = () => {
    setCreatingChat(false); // Não é mais necessário um estado de criação separado
    setSelectedChatId(null);
  };

  const handleFirstMessageSent = async (messageContent) => {
    try {
      const response = await chatApi.createChat();
      const newChat = response.data.chat;
      
      setCreatingChat(false);
      setSelectedChatId(newChat.id);
  
      const messageResponse = await chatApi.sendMessage(newChat.id, messageContent);
      
      await fetchChats();
      
    } catch (error) {
      showError('Erro ao criar conversa');
      setCreatingChat(false);
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await chatApi.deleteChat(chatId);
      
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      if (selectedChatId === chatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId);
        setSelectedChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
      }
    } catch (error) {
      console.error('Erro ao deletar chat:', error);
      throw error;
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: 'background.default'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <CircularProgress size={40} thickness={4} />
        </motion.div>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        bgcolor: 'background.default'
      }}
    >
      <Header toggleSidebar={toggleSidebar} showMenuButton={isMobile} />
      
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1, 
        overflow: 'hidden',
        position: 'relative',
        pt: { xs: 7, sm: 8, md: 8 },
        [theme.breakpoints.up('sm')]: {
          pt: theme.mixins.toolbar.minHeight || 64
        }
      }}>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={isMobile ? { x: -300 } : { opacity: 0 }}
              animate={isMobile ? { x: 0 } : { opacity: 1 }}
              exit={isMobile ? { x: -300 } : { opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30
              }}
              style={{
                position: isMobile ? 'absolute' : 'relative',
                zIndex: 10,
                height: '100%',
                width: isMobile ? '300px' : '350px',
                boxShadow: isMobile ? '0px 0px 15px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <ChatList 
                chats={chats}
                loading={loading}
                selectedChatId={selectedChatId}
                onChatSelect={handleChatSelect}
                onNewChat={handleNewChat}
                onDeleteChat={handleDeleteChat}
                onChatUpdated={fetchChats}
                pendingChatId={pendingChatId}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isMobile && sidebarOpen && (
          <Box 
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0,0,0,0.4)',
              zIndex: 5
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ 
            flexGrow: 1, 
            overflow: 'hidden',
            display: 'flex'
          }}
        >
          <ChatWindow 
            chatId={selectedChatId}
            onChatUpdated={handleChatUpdated}
          />
        </motion.div>
      </Box>
    </Box>
  );
};

export default Chat;
