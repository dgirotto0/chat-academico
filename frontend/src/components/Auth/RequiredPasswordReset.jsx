import React, { useState } from 'react';
import { 
  Container, Box, Typography, TextField, Paper, 
  Alert, InputAdornment, IconButton
} from '@mui/material';
import { 
  Lock as LockIcon,
  Visibility, 
  VisibilityOff
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingButton from '../Common/LoadingButton';

const RequiredPasswordReset = ({ onPasswordReset }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { resetRequiredPassword, loading, error } = useAuth();
  const { showSuccess, showError } = useNotification();

  const validateForm = () => {
    const newErrors = {};
    
    if (!oldPassword) {
      newErrors.oldPassword = 'Senha atual é obrigatória';
    }
    
    if (!newPassword) {
      newErrors.newPassword = 'Nova senha é obrigatória';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Nova senha deve ter pelo menos 8 caracteres';
    } else if (!/\d/.test(newPassword)) {
      newErrors.newPassword = 'Nova senha deve conter pelo menos um número';
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = 'Nova senha deve conter pelo menos uma letra maiúscula';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      newErrors.newPassword = 'Nova senha deve conter pelo menos um caractere especial';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      const result = await resetRequiredPassword(oldPassword, newPassword);
      if (result.success) {
        showSuccess('Senha alterada com sucesso!');
        if (onPasswordReset) onPasswordReset();
      } else {
        showError(result.message || 'Erro ao alterar senha');
      }
    } catch {
      showError('Ocorreu um erro ao tentar alterar sua senha');
    }
  };

  const calculatePasswordStrength = (password) => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    return strength;
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3
            }}
          >
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom 
              align="center" 
              fontWeight="bold"
              color="primary"
            >
              Alteração de Senha Obrigatória
            </Typography>
            <Typography 
              variant="body1" 
              align="center" 
              color="text.secondary" 
              sx={{ mb: 4 }}
            >
              Por questões de segurança, você precisa alterar sua senha antes de continuar
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                name="oldPassword"
                label="Senha Atual"
                type={showOldPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                margin="normal"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                error={!!errors.oldPassword}
                helperText={errors.oldPassword}
                disabled={loading}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color={errors.oldPassword ? "error" : "action"} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        edge="end"
                      >
                        {showOldPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                name="newPassword"
                label="Nova Senha"
                type={showNewPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                margin="normal"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={!!errors.newPassword}
                helperText={errors.newPassword}
                disabled={loading}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color={errors.newPassword ? "error" : "action"} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Box sx={{ mt: 1, mb: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Força da senha: {['Fraca', 'Razoável', 'Média', 'Forte'][passwordStrength - 1] || 'Muito fraca'}
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  height: 4, 
                  borderRadius: 2, 
                  overflow: 'hidden',
                  bgcolor: 'grey.200' 
                }}>
                  {[...Array(4)].map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        flex: 1,
                        bgcolor: i < passwordStrength ? 
                          ['error.main', 'warning.main', 'success.light', 'success.main'][i] : 
                          'transparent',
                        ml: i > 0 ? 0.5 : 0
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <TextField
                name="confirmPassword"
                label="Confirmar Nova Senha"
                type={showConfirmPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                margin="normal"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                disabled={loading}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color={errors.confirmPassword ? "error" : "action"} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <LoadingButton
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                loading={loading}
                loadingPosition="center"
              >
                Alterar Senha
              </LoadingButton>
            </form>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default RequiredPasswordReset;
