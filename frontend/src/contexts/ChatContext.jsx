import React, { createContext, useState, useContext, useEffect } from 'react';
import { chatApi } from '../services/api';
import { useAuth } from './AuthContext';

const ChatContext = createContext({});

export const ChatProvider = ({ children }) => {
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { user, isAuthenticated } = useAuth();
  
  // Carregar chats iniciais
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        const response = await chatApi.getChats();
        setChats(response.data);
        
        // Garantir que nenhum chat esteja selecionado inicialmente
        setCurrentChat(null);
        
      } catch (error) {
        console.error('Erro ao carregar chats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchChats();
    }
  }, [isAuthenticated]);
  
  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChat,
        setCurrentChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
