import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Layout/Header';
import ChatSidebar from '../components/Chat/ChatSidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import { chatApi } from '../services/api';
import { Menu as MenuIcon } from '@mui/icons-material';

const Chat = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fechar sidebar automaticamente em telas pequenas
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Buscar chats ao carregar a página
  useEffect(() => {
    fetchChats();
  }, []);

  // Selecionar o primeiro chat disponível ao carregar
  useEffect(() => {
    if (chats.length > 0 && !selectedChat) {
      setSelectedChat(chats[0].id);
    }
  }, [chats, selectedChat]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await chatApi.getChats();
      setChats(response.data);
    } catch (error) {
      console.error('Erro ao buscar chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatCreated = (newChat) => {
    setChats(prev => [newChat, ...prev]);
  };

  const handleChatUpdated = (updatedChat) => {
    setChats(prev => prev.map(chat => 
      chat.id === updatedChat.id ? updatedChat : chat
    ));
  };

  const handleChatDeleted = (chatId) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
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
        mt: 8, // Compensar a altura do Header
        position: 'relative'
      }}>
        {/* Sidebar com animação */}
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
                boxShadow: isMobile ? '0px 0px 15px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <ChatSidebar 
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={(id) => {
                  setSelectedChat(id);
                  if (isMobile) setSidebarOpen(false);
                }}
                onChatCreated={handleChatCreated}
                onChatUpdated={handleChatUpdated}
                onChatDeleted={handleChatDeleted}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay para fechar sidebar em dispositivos móveis */}
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
        
        {/* Botão de menu para dispositivos móveis (quando sidebar fechada) */}
        {isMobile && !sidebarOpen && (
          <Box 
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 5,
              bgcolor: 'background.paper',
              borderRadius: '50%',
              boxShadow: 2,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            onClick={toggleSidebar}
          >
            <MenuIcon />
          </Box>
        )}

        {/* Área principal com animação sutil */}
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
            chatId={selectedChat}
            onChatUpdated={handleChatUpdated}
          />
        </motion.div>
      </Box>
    </Box>
  );
};

export default Chat;
