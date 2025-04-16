import React, { useState } from 'react';
import { 
  Box, List, ListItem, ListItemText, ListItemButton, 
  Typography, IconButton, TextField, Dialog, 
  DialogTitle, DialogContent, DialogActions, Button,
  Divider, Tooltip, Badge, Chip, useTheme,
  InputAdornment, InputBase, Paper
} from '@mui/material';
import { 
  Add, Edit, Delete, Chat as ChatIcon, 
  Search as SearchIcon, MoreHoriz, ChatBubbleOutline,
  Close
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { chatApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import ConfirmDialog from '../Common/ConfirmDialog';
import LoadingButton from '../Common/LoadingButton';

const ChatSidebar = ({ chats, selectedChat, onSelectChat, onChatCreated, onChatDeleted, onChatUpdated }) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [editChatId, setEditChatId] = useState(null);
  const [editChatTitle, setEditChatTitle] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [updatingChat, setUpdatingChat] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [hoveredChat, setHoveredChat] = useState(null);
  
  const { showSuccess, showError, showInfo } = useNotification();

  // Filtrar chats de acordo com o termo de busca
  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Abrir diálogo para nova conversa
  const handleNewChatClick = () => {
    setNewChatTitle('');
    setIsDialogOpen(true);
  };

  // Criar nova conversa
  const handleCreateChat = async () => {
    try {
      setCreatingChat(true);
      showInfo('Criando nova conversa...');
      const response = await chatApi.createChat(newChatTitle || 'Nova Conversa');
      onChatCreated(response.data.chat);
      setIsDialogOpen(false);
      onSelectChat(response.data.chat.id);
      showSuccess('Conversa criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar nova conversa:', error);
      showError('Erro ao criar nova conversa. Tente novamente.');
    } finally {
      setCreatingChat(false);
    }
  };

  // Abrir diálogo para editar conversa
  const handleEditClick = (chatId, currentTitle, event) => {
    event.stopPropagation();
    setEditChatId(chatId);
    setEditChatTitle(currentTitle);
    setIsEditDialogOpen(true);
  };

  // Atualizar conversa
  const handleUpdateChat = async () => {
    try {
      setUpdatingChat(true);
      showInfo('Atualizando título da conversa...');
      const response = await chatApi.updateChat(editChatId, editChatTitle);
      onChatUpdated(response.data.chat);
      setIsEditDialogOpen(false);
      showSuccess('Título atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar conversa:', error);
      showError('Erro ao atualizar título. Tente novamente.');
    } finally {
      setUpdatingChat(false);
    }
  };

  // Abrir diálogo de confirmação para excluir conversa
  const handleDeleteClick = (chatId, event) => {
    event.stopPropagation();
    setChatToDelete(chatId);
    setConfirmDeleteOpen(true);
  };

  // Excluir conversa após confirmação
  const handleDeleteChat = async () => {
    try {
      setDeletingChat(true);
      showInfo('Excluindo conversa...');
      await chatApi.deleteChat(chatToDelete);
      onChatDeleted(chatToDelete);
      
      // Se a conversa atual foi excluída, selecionar a primeira disponível
      if (selectedChat === chatToDelete) {
        const remainingChats = chats.filter(chat => chat.id !== chatToDelete);
        if (remainingChats.length > 0) {
          onSelectChat(remainingChats[0].id);
        } else {
          onSelectChat(null);
        }
      }
      
      showSuccess('Conversa excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
      showError('Erro ao excluir conversa. Tente novamente.');
    } finally {
      setDeletingChat(false);
      setConfirmDeleteOpen(false);
      setChatToDelete(null);
    }
  };

  // Formatar data da última atividade
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', {
        weekday: 'short'
      });
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    }
  };

  // Calcular se a conversa é recente (menos de 24h)
  const isRecentChat = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  return (
    <Box sx={{ 
      width: 280, 
      borderRight: '1px solid', 
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      bgcolor: theme.palette.mode === 'light' ? '#f5f5f5' : '#1e1e1e'
    }}>
      {/* Área de cabeçalho com botão de nova conversa */}
      <Box sx={{ 
        py: 2, 
        px: 2,
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <LoadingButton
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={handleNewChatClick}
          loading={creatingChat}
          sx={{ 
            mb: 2,
            py: 1,
            borderRadius: 2,
            textTransform: 'none',
            boxShadow: 1
          }}
        >
          Nova Conversa
        </LoadingButton>
        
        {/* Campo de busca */}
        <Paper
          elevation={0}
          sx={{ 
            p: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <IconButton 
            sx={{ p: '5px' }} 
            aria-label="search"
            disabled
          >
            <SearchIcon fontSize="small" />
          </IconButton>
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <IconButton 
              sx={{ p: '5px' }} 
              aria-label="limpar busca"
              onClick={() => setSearchTerm('')}
            >
              <Close fontSize="small" />
            </IconButton>
          )}
        </Paper>
      </Box>
      
      <Divider />

      {/* Lista de chats */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, py: 1 }}>
        {filteredChats.length === 0 ? (
          <Box sx={{ 
            p: 3, 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            <ChatBubbleOutline sx={{ 
              fontSize: 48, 
              color: 'text.disabled', 
              mb: 2,
              opacity: 0.7
            }} />
            <Typography color="text.secondary" gutterBottom>
              {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa iniciada'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm ? 'Tente usar outros termos na busca' : 'Comece uma nova conversa para interagir com o assistente'}
            </Typography>
            {searchTerm ? (
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<Close />} 
                onClick={() => setSearchTerm('')}
              >
                Limpar busca
              </Button>
            ) : (
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<Add />} 
                onClick={handleNewChatClick}
              >
                Nova Conversa
              </Button>
            )}
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            <AnimatePresence>
              {filteredChats.map((chat) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <ListItem 
                    disablePadding 
                    sx={{ mb: 0.5 }}
                    onMouseEnter={() => setHoveredChat(chat.id)}
                    onMouseLeave={() => setHoveredChat(null)}
                  >
                    <ListItemButton
                      selected={selectedChat === chat.id}
                      onClick={() => onSelectChat(chat.id)}
                      sx={{ 
                        py: 1.5,
                        px: 2,
                        borderRadius: 2,
                        transition: 'background-color 0.2s',
                        '&.Mui-selected': {
                          bgcolor: 'primary.light',
                          color: 'primary.contrastText',
                          fontWeight: 'medium',
                          '&:hover': {
                            bgcolor: 'primary.main',
                          }
                        },
                        '&:hover': {
                          bgcolor: 'action.hover',
                          '&.Mui-selected': {
                            bgcolor: 'primary.main',
                          }
                        }
                      }}
                    >
                      <ListItemText 
                        primary={
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <Typography 
                              variant="body2" 
                              noWrap 
                              fontWeight={selectedChat === chat.id ? 600 : 400}
                              sx={{ 
                                maxWidth: '160px',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {chat.title}
                            </Typography>
                            <Box>
                              {isRecentChat(chat.lastActivity) && (
                                <Badge 
                                  variant="dot" 
                                  color="primary"
                                  sx={{ mr: 1 }}
                                />
                              )}
                              <Typography 
                                variant="caption" 
                                color={selectedChat === chat.id ? 'inherit' : 'text.secondary'}
                              >
                                {chat.lastActivity ? formatDate(chat.lastActivity) : 'Nova'}
                              </Typography>
                            </Box>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mt: 0.5
                          }}>
                            <Typography 
                              variant="caption" 
                              color={selectedChat === chat.id ? 'primary.contrastText' : 'text.secondary'}
                              sx={{ opacity: 0.8 }}
                            >
                              Última interação
                            </Typography>
                            
                            {/* Ações de editar/excluir */}
                            {(hoveredChat === chat.id || selectedChat === chat.id) && (
                              <Box sx={{ display: 'flex' }}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleEditClick(chat.id, chat.title, e)}
                                  sx={{ 
                                    p: 0.5,
                                    color: selectedChat === chat.id ? 'primary.contrastText' : 'action.active',
                                    '&:hover': {
                                      bgcolor: selectedChat === chat.id ? 'primary.dark' : 'action.hover'
                                    }
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleDeleteClick(chat.id, e)}
                                  sx={{ 
                                    p: 0.5,
                                    color: selectedChat === chat.id ? 'primary.contrastText' : 'action.active',
                                    '&:hover': {
                                      bgcolor: selectedChat === chat.id ? 'primary.dark' : 'action.hover'
                                    }
                                  }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                        }
                        primaryTypographyProps={{
                          component: 'div'
                        }}
                        secondaryTypographyProps={{
                          component: 'div'
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </List>
        )}
      </Box>

      {/* Diálogo para criar nova conversa */}
      <Dialog 
        open={isDialogOpen} 
        onClose={() => !creatingChat && setIsDialogOpen(false)}
        PaperProps={{
          component: motion.div,
          initial: { y: -20, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: { duration: 0.2 },
          sx: { borderRadius: 3 }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pb: 1 }}>Nova Conversa</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Título da conversa"
            type="text"
            fullWidth
            variant="outlined"
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            placeholder="Nova Conversa"
            disabled={creatingChat}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <ChatIcon color="primary" />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setIsDialogOpen(false)} 
            disabled={creatingChat}
            variant="outlined"
          >
            Cancelar
          </Button>
          <LoadingButton 
            onClick={handleCreateChat} 
            color="primary"
            loading={creatingChat}
            variant="contained"
          >
            Criar
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Diálogo para editar conversa */}
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => !updatingChat && setIsEditDialogOpen(false)}
        PaperProps={{
          component: motion.div,
          initial: { y: -20, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: { duration: 0.2 },
          sx: { borderRadius: 3 }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pb: 1 }}>Editar Conversa</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Título da conversa"
            type="text"
            fullWidth
            variant="outlined"
            value={editChatTitle}
            onChange={(e) => setEditChatTitle(e.target.value)}
            disabled={updatingChat}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <ChatIcon color="primary" />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setIsEditDialogOpen(false)}
            disabled={updatingChat}
            variant="outlined"
          >
            Cancelar
          </Button>
          <LoadingButton 
            onClick={handleUpdateChat} 
            color="primary"
            loading={updatingChat}
            variant="contained"
          >
            Salvar
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmação para excluir conversa */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteChat}
        title="Excluir conversa"
        message="Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita e todas as mensagens serão perdidas."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="error"
        loading={deletingChat}
      />
    </Box>
  );
};

export default ChatSidebar;
