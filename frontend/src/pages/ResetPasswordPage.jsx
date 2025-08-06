import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Container, Box, Typography, TextField, Button, Paper, 
  CircularProgress, Alert, InputAdornment, IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, LockResetOutlined } from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../services/api';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    // Extract token from URL query params
    const queryParams = new URLSearchParams(location.search);
    const tokenParam = queryParams.get('token');
    
    if (!tokenParam) {
      // Redireciona para login se não houver token
      navigate('/login', { replace: true });
      return;
    } else {
      setToken(tokenParam);
    }
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    
    setLoading(true);
    
    try {
      await api.post('/auth/reset-password-with-token', { 
        token,
        newPassword 
      });
      
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      
      let errorMessage = 'Erro ao redefinir senha. Tente novamente.';
      
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mt: 8,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LockResetOutlined sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" component="h1" gutterBottom>
              Redefinir Senha
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Digite sua nova senha abaixo
            </Typography>
          </Box>

          {tokenError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => navigate('/login')}
                >
                  Voltar para o Login
                </Button>
              </Box>
            </Alert>
          ) : success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Senha redefinida com sucesso! Você será redirecionado para a página de login em instantes...
            </Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <TextField
                fullWidth
                margin="normal"
                label="Nova senha"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                helperText="Mínimo de 6 caracteres"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              
              <TextField
                fullWidth
                margin="normal"
                label="Confirmar nova senha"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={confirmPassword !== '' && confirmPassword !== newPassword}
                helperText={confirmPassword !== '' && confirmPassword !== newPassword ? 'As senhas não coincidem' : ''}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Redefinir Senha'}
              </Button>
              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button
                  onClick={() => navigate('/login')}
                  variant="text"
                  color="primary"
                >
                  Voltar para o Login
                </Button>
              </Box>
            </form>
          )}
        </Paper>
      </motion.div>
    </Container>
  );
};

export default ResetPasswordPage;
