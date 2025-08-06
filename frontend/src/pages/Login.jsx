import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Box, Typography, TextField, Paper, 
  Alert, InputAdornment, Link, Dialog, DialogTitle, 
  DialogContent, DialogContentText, DialogActions, Button,
  IconButton, CircularProgress
} from '@mui/material';
import { 
  Email as EmailIcon, 
  Lock as LockIcon,
  Visibility, 
  VisibilityOff,
  LockOutlined
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingButton from '../components/Common/LoadingButton';
import RequiredPasswordReset from '../components/Auth/RequiredPasswordReset';
import SubscriptionAlert from '../components/Common/SubscriptionAlert';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const { login, forgotPassword, isAuthenticated, loading, error, mustResetPassword } = useAuth();
  const navigate = useNavigate();
  
  // Forgot password states
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Redirecionar se já estiver autenticado e não precisa resetar
  useEffect(() => {
    if (isAuthenticated && !mustResetPassword) {
      navigate('/app/chat');
    }
  }, [isAuthenticated, mustResetPassword, navigate]);

  const validateField = (name, value) => {
    let err = '';
    if (name === 'email') {
      if (!value) err = 'Email é obrigatório';
      else if (!/\S+@\S+\.\S+/.test(value)) err = 'Email inválido';
    }
    if (name === 'password' && !value) err = 'Senha é obrigatória';
    return err;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') setEmail(value);
    if (name === 'password') setPassword(value);
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateForm = () => {
    const newErrors = {
      email: validateField('email', email),
      password: validateField('password', password)
    };
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/app/chat');
      } else if (result.status) {
        setSubscriptionStatus(result.status);
        setSubscriptionMessage(result.message);
      }
    } catch (error) {
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotError('Por favor, insira seu e-mail');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const result = await forgotPassword(forgotEmail.trim());
      if (result.success) setForgotSuccess(true);
      else setForgotError(result.message);
    } catch {
      setForgotError('Ocorreu um erro ao processar sua solicitação');
    } finally {
      setForgotLoading(false);
    }
  };

  const handlePasswordResetComplete = () => {
    navigate('/login');
  };

  if (mustResetPassword) {
    return (
      <RequiredPasswordReset 
        onPasswordReset={handlePasswordResetComplete} 
      />
    );
  }

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
              Scientifique AI
            </Typography>
            <Typography 
              variant="body1" 
              align="center" 
              color="text.secondary" 
              sx={{ mb: 4 }}
            >
              Entre com suas credenciais para acessar a plataforma
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            <SubscriptionAlert 
              status={subscriptionStatus} 
              message={subscriptionMessage}
            />

            <form onSubmit={handleSubmit}>
              <TextField
                name="email"
                label="Email"
                type="email"
                variant="outlined"
                fullWidth
                margin="normal"
                value={email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                disabled={loading}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color={errors.email ? "error" : "action"} />
                    </InputAdornment>
                  ),
                }}
                aria-label="Campo de email"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <TextField
                name="password"
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                margin="normal"
                value={password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                disabled={loading}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color={errors.password ? "error" : "action"} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                aria-label="Campo de senha"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e);
                  }
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
                Entrar
              </LoadingButton>
            </form>
            <Box sx={{ textAlign: 'right', mt: 1 }}>
              <Link 
                component="button" 
                variant="body2" 
                onClick={(e) => {
                  e.preventDefault();
                  setForgotDialogOpen(true);
                }}
                underline="hover"
              >
                Esqueceu sua senha?
              </Link>
            </Box>
          </Paper>
        </motion.div>
      </Box>
      
      {/* Forgot Password Dialog */}
      <Dialog open={forgotDialogOpen} onClose={() => !forgotLoading && setForgotDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockOutlined color="primary" />
            Recuperação de Senha
          </Box>
        </DialogTitle>
        <DialogContent>
          {forgotSuccess ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Se este e-mail estiver cadastrado, você receberá instruções em breve.
            </Alert>
          ) : (
            <>
              <DialogContentText>
                Digite seu e-mail abaixo para receber um link de recuperação de senha.
              </DialogContentText>
              {forgotError && (
                <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
                  {forgotError}
                </Alert>
              )}
              <TextField
                autoFocus
                margin="dense"
                label="Email"
                type="email"
                fullWidth
                variant="outlined"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                disabled={forgotLoading}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {forgotSuccess ? (
            <Button 
              onClick={() => {
                setForgotDialogOpen(false);
                setForgotSuccess(false);
                setForgotEmail('');
              }}
              variant="contained"
            >
              Fechar
            </Button>
          ) : (
            <>
              <Button 
                onClick={() => setForgotDialogOpen(false)} 
                disabled={forgotLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleForgotPassword} 
                variant="contained"
                disabled={forgotLoading}
                startIcon={forgotLoading ? <CircularProgress size={20} /> : null}
              >
                {forgotLoading ? 'Enviando...' : 'Enviar'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Login;
