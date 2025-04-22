import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Chip, Tooltip, Box, Typography, 
  TextField, InputAdornment, Fade, Zoom
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import LoadingButton from '../Common/LoadingButton';
import ConfirmDialog from '../Common/ConfirmDialog';

const UserList = ({ users, onEdit, onDelete, onAdd, currentUserId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Filtrar usuários pelo termo de busca
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Abrir diálogo de confirmação para deletar
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  // Confirmar exclusão
  const handleConfirmDelete = async () => {
    try {
      setDeletingUser(true);
      await onDelete(userToDelete.id);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
    } finally {
      setDeletingUser(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Cancelar exclusão
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  // Helper function to get status chip info
  const getStatusChip = (user) => {
    let statusText = 'Indeterminado';
    let statusColor = 'default';
    let icon = null;

    if (user.active) {
      statusText = 'Ativo';
      statusColor = 'success';
      icon = <CheckIcon />;
    } else {
      switch (user.status) {
        case 'approved':
          statusText = 'Ativo';
          statusColor = 'success';
          break;
        case 'canceled':
          statusText = 'Cancelado';
          statusColor = 'error';
          break;
        case 'refunded':
          statusText = 'Reembolsado';
          statusColor = 'error';
          break;
        case 'expired':
          statusText = 'Expirado';
          statusColor = 'warning';
          break;
        case 'refused':
          statusText = 'Recusado';
          statusColor = 'warning';
          break;
        case 'pending':
          statusText = 'Pendente';
          statusColor = 'info';
          break;
        default:
          statusText = 'Inativo';
          statusColor = 'error';
      }
      icon = <CloseIcon />;
    }

    return {
      text: statusText,
      color: statusColor,
      icon: icon
    };
  };

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Buscar usuários..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          aria-label="Buscar usuários"
        />
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <LoadingButton
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={onAdd}
            aria-label="Adicionar novo usuário"
          >
            Novo Usuário
          </LoadingButton>
        </motion.div>
      </Box>

      {filteredUsers.length === 0 ? (
        <Fade in={true} timeout={800}>
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography color="text.secondary" variant="h6" gutterBottom>
              Nenhum usuário encontrado.
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
              {searchTerm ? 'Tente outro termo de busca.' : 'Adicione novos usuários usando o botão acima.'}
            </Typography>
            {searchTerm && (
              <LoadingButton
                variant="outlined"
                color="primary"
                onClick={() => setSearchTerm('')}
                aria-label="Limpar busca"
              >
                Limpar Busca
              </LoadingButton>
            )}
          </Paper>
        </Fade>
      ) : (
        <TableContainer 
          component={Paper}
          sx={{ 
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: 1
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user, index) => {
                const statusChip = getStatusChip(user);

                return (
                  <Zoom 
                    in={true} 
                    key={user.id}
                    style={{ transitionDelay: `${index * 50}ms` }}
                  >
                    <TableRow 
                      sx={{ 
                        '&:hover': { bgcolor: 'action.hover' },
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role === 'admin' ? 'Administrador' : 'Aluno'} 
                          color={user.role === 'admin' ? 'secondary' : 'default'}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={statusChip.icon}
                          label={statusChip.text} 
                          color={statusChip.color}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar usuário" arrow>
                          <IconButton 
                            onClick={() => onEdit(user)}
                            color="primary"
                            aria-label={`Editar usuário ${user.name}`}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.id === currentUserId ? "Não é possível excluir a si mesmo" : "Excluir usuário"} arrow>
                          <span>
                            <IconButton 
                              onClick={() => handleDeleteClick(user)}
                              disabled={user.id === currentUserId}
                              color="error"
                              aria-label={`Excluir usuário ${user.name}`}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  </Zoom>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Diálogo de confirmação para exclusão */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Você tem certeza que deseja excluir o usuário "${userToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="error"
        loading={deletingUser}
      />
    </>
  );
};

export default UserList;
