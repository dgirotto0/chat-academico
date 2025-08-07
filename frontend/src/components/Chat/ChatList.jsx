import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  IconButton,
  Divider,
  Skeleton,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import {
  Add,
  MoreVert,
  Delete,
  Edit,
  Chat as ChatIcon
} from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingButton from '../Common/LoadingButton';

const ChatList = ({ 
  chats = [], // Valor padrão como array vazio
  loading = false,
  selectedChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  onChatUpdated,
  pendingChatId // Novo prop
}) => {
  const [creating, setCreating] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);

  const handleCreateChat = async () => {
    setCreating(true);
    try {
      await onNewChat();
    } catch (error) {
    } finally {
      setCreating(false);
    }
  };

  const handleMenuOpen = (event, chat) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedChat(chat);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEditClick = () => {
    setEditTitle(selectedChat.title);
    setEditDialog(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialog(true);
    handleMenuClose(); // Fecha apenas o menu, mantém selectedChat
  };

  const handleEditSave = async () => {
    if (!editTitle.trim()) return;
    
    try {
      // Implementar atualização do título via API
      await onChatUpdated();
    } catch (error) {
    } finally {
      setEditDialog(false);
      setEditTitle('');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedChat) {
      setDeleteDialog(false);
      return;
    }
    try {
      await onDeleteChat(selectedChat.id);
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
    } finally {
      setDeleteDialog(false);
      setSelectedChat(null); // Limpa aqui, após ação
      setMenuAnchor(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Hoje';
    if (diffDays === 2) return 'Ontem';
    if (diffDays <= 7) return `${diffDays} dias atrás`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Conversas
          </Typography>
          <Tooltip title="Nova conversa">
            <LoadingButton
              variant="contained"
              color="primary"
              size="small"
              onClick={handleCreateChat}
              loading={creating}
              disabled={creating}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              <Add />
            </LoadingButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Lista de chats */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          // Skeleton loading
          <List>
            {Array.from(new Array(5)).map((_, index) => (
              <ListItem key={index} sx={{ px: 2, py: 1.5 }}>
                <Box sx={{ width: '100%' }}>
                  <Skeleton variant="text" width="80%" height={20} />
                  <Skeleton variant="text" width="60%" height={16} sx={{ mt: 0.5 }} />
                </Box>
              </ListItem>
            ))}
          </List>
        ) : chats.length === 0 ? (
          // Estado vazio
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            p: 3,
            textAlign: 'center'
          }}>
            <ChatIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhuma conversa ainda
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Crie sua primeira conversa para começar a usar o assistente
            </Typography>
            <LoadingButton
              variant="contained"
              color="primary"
              onClick={handleCreateChat}
              loading={creating}
              disabled={creating}
              startIcon={<Add />}
            >
              Nova Conversa
            </LoadingButton>
          </Box>
        ) : (
          // Lista de chats (exclui chat pendente)
          <List sx={{ p: 0 }}>
            {chats
              .filter(chat => chat && typeof chat === 'object' && chat.id && chat.id !== pendingChatId) // Filtrar chats inválidos e chat pendente
              .map((chat) => (
                <ListItem key={chat.id} sx={{ p: 0 }}>
                  <ListItemButton
                    selected={selectedChatId === chat.id}
                    onClick={() => onChatSelect(chat.id)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRadius: 0,
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                        borderRight: '3px solid',
                        borderRightColor: 'primary.main'
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography 
                          variant="body2" 
                          fontWeight={selectedChatId === chat.id ? 600 : 500}
                          sx={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {chat.title || 'Nova Conversa'}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(chat.updatedAt || chat.createdAt)}
                        </Typography>
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, chat)}
                      sx={{ 
                        opacity: selectedChatId === chat.id ? 1 : 0,
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 1 }
                      }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                </ListItem>
              ))}
          </List>
        )}
      </Box>

      {/* Menu de ações */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 160 }
        }}
      >
        <MenuItem onClick={handleEditClick}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Editar título
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Excluir
        </MenuItem>
      </Menu>

      {/* Dialog de edição */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar título da conversa</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Digite o novo título..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained"
            disabled={!editTitle.trim()}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Excluir conversa</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatList;
