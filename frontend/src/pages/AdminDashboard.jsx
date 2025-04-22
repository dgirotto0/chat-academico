import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Container, Typography, Paper, Divider, 
  CircularProgress, Breadcrumbs, Link, Fade
} from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import Header from '../components/Layout/Header';
import UserList from '../components/Admin/UserList';
import UserForm from '../components/Admin/UserForm';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const { user: currentUser } = useAuth();
  const { showSuccess, showError, showInfo } = useNotification();
  const navigate = useNavigate();

  // Criar uma versão memoizada da função fetchUsers com useCallback
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      showError('Erro ao carregar usuários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Buscar todos os usuários ao carregar
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Abrir formulário para criação de usuário
  const handleAddUser = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  // Abrir formulário para edição de usuário
  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  // Excluir usuário
  const handleDeleteUser = async (userId) => {
    try {
      showInfo('Excluindo usuário...');
      await adminApi.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showSuccess('Usuário excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      showError('Erro ao excluir usuário. Tente novamente.');
    }
  };

  // Salvar usuário (criar ou atualizar)
  const handleSaveUser = async (userData, userId) => {
    try {
      setFormLoading(true);
      
      if (userId) {
        // Atualizar usuário existente
        const response = await adminApi.updateUser(userId, userData);
        setUsers(prev => prev.map(u => u.id === userId ? response.data.user : u));
        showSuccess('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário
        showInfo('Criando novo usuário...');
        const response = await adminApi.createUser(userData);
        setUsers(prev => [...prev, response.data.user]);
        showSuccess('Usuário criado com sucesso!');
      }
      
      setFormOpen(false);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      showError(error.response?.data?.message || 'Erro ao salvar usuário. Tente novamente.');
    } finally {
      setFormLoading(false);
    }
  };

  // Navegar para a página do chat
  const handleNavigateToChat = () => {
    navigate('/');
  };

  if (loading && users.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 2 
      }}>
        <CircularProgress size={40} />
        <Typography variant="body1" color="text.secondary">
          Carregando usuários...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Container maxWidth="lg" sx={{ mt: 12, mb: 4 }}>
        {/* Navegação */}
        <Breadcrumbs 
          separator={<NavigateNextIcon fontSize="small" />} 
          sx={{ mb: 3 }}
          aria-label="breadcrumb"
        >
          <Link 
            color="inherit" 
            onClick={handleNavigateToChat}
            sx={{ 
              cursor: 'pointer', 
              '&:hover': { textDecoration: 'underline' },
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="Voltar para a página inicial"
          >
            Início
          </Link>
          <Typography color="text.primary">Painel Administrativo</Typography>
        </Breadcrumbs>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              mb: 4,
              borderRadius: 2,
              background: 'linear-gradient(to right, #2563eb, #3b82f6)',
              color: 'white'
            }}
          >
            <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
              Painel Administrativo
            </Typography>
            <Typography variant="body1">
              Gerencie os usuários do sistema.
            </Typography>
          </Paper>
        </motion.div>
        
        <Fade in={true} timeout={800}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3,
              borderRadius: 2
            }}
          >
            <Typography variant="h6" component="h2" gutterBottom>
              Usuários
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <UserList 
              users={users}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
              onAdd={handleAddUser}
              currentUserId={currentUser?.id}
            />
          </Paper>
        </Fade>
      </Container>
      
      {/* Modal de criação/edição de usuário */}
      <UserForm 
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveUser}
        user={editingUser}
        loading={formLoading}
      />
    </Box>
  );
};

export default AdminDashboard;
