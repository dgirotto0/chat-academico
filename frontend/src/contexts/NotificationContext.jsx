import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';

const NotificationContext = createContext();

const SlideTransition = (props) => {
  return <Slide {...props} direction="down" />;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const showNotification = useCallback((message, severity = 'info', duration = 3000) => {
    setNotification({
      open: true,
      message,
      severity
    });

    // Auto hide apenas para success e info
    if (severity === 'success' || severity === 'info') {
      setTimeout(() => {
        setNotification(prev => ({ ...prev, open: false }));
      }, duration);
    }
  }, []);

  // Apenas erros críticos e sucessos importantes
  const showError = useCallback((message) => {
    showNotification(message, 'error', 4000);
  }, [showNotification]);

  const showSuccess = useCallback((message) => {
    // Filtrar mensagens desnecessárias
    const unnecessaryMessages = [
      'mensagem enviada',
      'arquivo anexado',
      'texto copiado',
      'seleção de arquivo cancelada'
    ];
    
    const isUnnecessary = unnecessaryMessages.some(msg => 
      message.toLowerCase().includes(msg)
    );
    
    if (!isUnnecessary) {
      showNotification(message, 'success', 2500);
    }
  }, [showNotification]);

  const showWarning = useCallback((message) => {
    showNotification(message, 'warning', 3500);
  }, [showNotification]);

  // Remover showInfo - não mostrar informações desnecessárias
  const showInfo = useCallback(() => {}, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  return (
    <NotificationContext.Provider value={{
      showError,
      showSuccess,
      showWarning,
      showInfo,
      hideNotification
    }}>
      {children}
      <Snackbar
        open={notification.open}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={SlideTransition}
        sx={{
          '& .MuiSnackbar-root': {
            top: '24px !important'
          }
        }}
      >
        <Alert
          onClose={notification.severity === 'error' ? hideNotification : undefined}
          severity={notification.severity}
          variant="filled"
          sx={{
            minWidth: '300px',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            '& .MuiAlert-icon': {
              fontSize: '18px'
            },
            '& .MuiAlert-message': {
              padding: '2px 0'
            }
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
