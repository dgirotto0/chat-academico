import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography,
  Box
} from '@mui/material';
import { motion } from 'framer-motion';
import { 
  Warning as WarningIcon, 
  Error as ErrorIcon, 
  Info as InfoIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';

const iconComponents = {
  warning: <WarningIcon fontSize="large" color="warning" />,
  error: <ErrorIcon fontSize="large" color="error" />,
  info: <InfoIcon fontSize="large" color="info" />,
  success: <SuccessIcon fontSize="large" color="success" />
};

const ConfirmDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  type = "warning", // warning, error, info, success
  confirmButtonColor = type === "error" ? "error" : "primary",
  loading = false,
  fullWidth = true,
  maxWidth = "xs"
}) => {
  // Definir o ícone com base no tipo
  const icon = iconComponents[type] || iconComponents.warning;

  return (
    <Dialog 
      open={open} 
      onClose={loading ? null : onClose}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      PaperComponent={motion.div}
      PaperProps={{
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2 },
        sx: {
          borderRadius: 2,
          boxShadow: 24,
          backgroundColor: 'var(--toastify-toast-background)'
        }
      }}
      
    >
      <DialogTitle id="alert-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography id="alert-dialog-description" variant="body1">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose} 
          color="inherit" 
          disabled={loading}
          variant="outlined"
          aria-label="Cancelar ação"
        >
          {cancelText}
        </Button>
        <Button 
          onClick={onConfirm} 
          color={confirmButtonColor}
          variant="contained"
          disabled={loading}
          autoFocus
          aria-label="Confirmar ação"
        >
          {loading ? "Processando..." : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
