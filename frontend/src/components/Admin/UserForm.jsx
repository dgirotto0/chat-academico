import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, FormControl, InputLabel, Select, 
  MenuItem, FormControlLabel, Switch, Grid,
  FormHelperText, IconButton, InputAdornment, 
  Typography, Box
} from '@mui/material';
import { 
  Visibility, VisibilityOff, 
  PersonOutline, Email, 
  AdminPanelSettings
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import LoadingButton from '../Common/LoadingButton';

const UserForm = ({ open, onClose, onSave, user = null, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'aluno',
    active: true
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Preencher formulário quando estiver editando
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '', // Não preenchemos a senha ao editar
        role: user.role || 'aluno',
        active: user.active !== undefined ? user.active : true
      });
    } else {
      // Reset ao criar novo usuário
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'aluno',
        active: true
      });
    }
    
    setErrors({});
    setTouched({});
  }, [user, open]);

  // Validar um único campo
  const validateField = (name, value) => {
    let error = '';
    
    switch(name) {
      case 'name':
        if (!value.trim()) {
          error = 'Nome é obrigatório';
        }
        break;
      case 'email':
        if (!value.trim()) {
          error = 'Email é obrigatório';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          error = 'Email inválido';
        }
        break;
      case 'password':
        if (!user && !value) {
          error = 'Senha é obrigatória';
        } else if (value && value.length < 6) {
          error = 'Senha deve ter pelo menos 6 caracteres';
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    
    // Para o Switch que usa checked ao invés de value
    const newValue = name === 'active' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Marcar campo como tocado
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validar campo em tempo real
    const error = validateField(name, newValue);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    // Marcar campo como tocado quando perder o foco
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validar campo
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const validateForm = () => {
    // Validar todos os campos
    const newErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password)
    };
    
    // Marcar todos os campos como tocados
    setTouched({
      name: true,
      email: true,
      password: true,
      role: true
    });
    
    setErrors(newErrors);
    return !newErrors.name && !newErrors.email && !newErrors.password;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Se estiver editando e a senha estiver vazia, não enviá-la
      const dataToSend = { ...formData };
      if (user && !dataToSend.password) {
        delete dataToSend.password;
      }
      
      onSave(dataToSend, user?.id);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <Dialog 
      open={open} 
      onClose={!loading ? onClose : undefined}
      fullWidth
      maxWidth="sm"
      PaperComponent={motion.div}
      PaperProps={{
        initial: { opacity: 1, y: -20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
        sx: {
          borderRadius: 2,
          boxShadow: 24,
          backgroundColor: 'var(--toastify-toast-background)'
        }
      }}
      aria-labelledby="user-form-dialog-title"
    >
      <DialogTitle id="user-form-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AdminPanelSettings sx={{ mr: 1 }} color="primary" />
          <Typography variant="h6" component="span">
            {user ? 'Editar Usuário' : 'Novo Usuário'}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              label="Nome"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              fullWidth
              error={touched.name && !!errors.name}
              helperText={touched.name && errors.name}
              disabled={loading}
              required
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline 
                      color={touched.name && errors.name ? "error" : "action"} 
                    />
                  </InputAdornment>
                ),
              }}
              autoFocus
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              fullWidth
              error={touched.email && !!errors.email}
              helperText={touched.email && errors.email}
              disabled={loading}
              required
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email 
                      color={touched.email && errors.email ? "error" : "action"} 
                    />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label={user ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha'}
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              fullWidth
              error={touched.password && !!errors.password}
              helperText={(touched.password && errors.password) || 
                (user ? 'Deixe em branco para manter a senha atual' : 'A senha deve ter pelo menos 6 caracteres')}
              disabled={loading}
              required={!user}
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl 
              fullWidth 
              error={touched.role && !!errors.role}
              disabled={loading}
              required
            >
              <InputLabel id="role-label">Tipo de Usuário</InputLabel>
              <Select
                labelId="role-label"
                name="role"
                value={formData.role}
                onChange={handleChange}
                onBlur={handleBlur}
                label="Tipo de Usuário"
              >
                <MenuItem value="aluno">Aluno</MenuItem>
                <MenuItem value="admin">Administrador</MenuItem>
              </Select>
              {touched.role && errors.role && (
                <FormHelperText>{errors.role}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          
          {user && (
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={handleChange}
                    name="active"
                    color="primary"
                    disabled={loading}
                  />
                }
                label={
                  <Typography color={formData.active ? "success.main" : "error.main"}>
                    {formData.active ? "Usuário Ativo" : "Usuário Inativo"}
                  </Typography>
                }
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <LoadingButton 
          onClick={onClose} 
          disabled={loading}
          variant="outlined"
          color="inherit"
        >
          Cancelar
        </LoadingButton>
        <LoadingButton 
          onClick={handleSubmit} 
          color="primary" 
          loading={loading}
          loadingPosition="center"
          variant="contained"
          disabled={loading}
        >
          {user ? 'Salvar' : 'Criar'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default UserForm;
