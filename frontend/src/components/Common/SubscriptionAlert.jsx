import React from 'react';
import { Box, Alert, Typography, Button, Paper } from '@mui/material';
import { WarningAmber, Block, AccessTime, AttachMoney } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const SubscriptionAlert = ({ status, message }) => {
  const navigate = useNavigate();
  
  if (!status || status === 'approved' || status === 'pending') return null;
  
  // Configurações baseadas no status
  let icon = <WarningAmber />;
  let severity = 'warning';
  let title = 'Atenção';
  let actionText = 'Atualizar assinatura';
  let actionUrl = 'https://checkout.hotmart.com/seu-produto';
  
  switch (status) {
    case 'pending':
      icon = <AccessTime />;
      title = 'Pagamento em Processamento';
      actionText = 'Verificar Status';
      break;
      
    case 'refused':
      icon = <Block color="error" />;
      severity = 'error';
      title = 'Pagamento Recusado';
      actionText = 'Atualizar Forma de Pagamento';
      break;
      
    case 'refunded':
      icon = <AttachMoney color="error" />;
      severity = 'error';
      title = 'Assinatura Reembolsada';
      actionText = 'Entrar em Contato';
      actionUrl = '/contato';
      break;
      
    case 'expired':
      icon = <Block color="error" />;
      severity = 'error';
      title = 'Assinatura Expirada';
      actionText = 'Renovar Assinatura';
      break;
      
    case 'canceled':
      icon = <Block color="error" />;
      severity = 'error';
      title = 'Assinatura Cancelada';
      actionText = 'Assinar Novamente';
      break;
      
    default:
      // Status desconhecido, mantém o padrão
  }
  
  const handleAction = () => {
    if (actionUrl.startsWith('http')) {
      window.open(actionUrl, '_blank');
    } else {
      navigate(actionUrl);
    }
  };
  
  return (
    <Paper sx={{ mt: 2, mb: 4, overflow: 'hidden' }}>
      <Alert 
        severity={severity}
        icon={icon}
        variant="filled"
        sx={{ 
          borderRadius: 0,
          display: 'flex',
          alignItems: 'flex-start'
        }}
      >
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="subtitle1" fontWeight="bold" component="div">
            {title}
          </Typography>
          <Typography variant="body2" component="div" sx={{ mt: 0.5, mb: 1 }}>
            {message}
          </Typography>
          <Button 
            variant="contained" 
            size="small" 
            onClick={handleAction}
            sx={{ 
              bgcolor: 'white', 
              color: severity === 'error' ? 'error.main' : 'warning.main',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.8)'
              }
            }}
          >
            {actionText}
          </Button>
        </Box>
      </Alert>
    </Paper>
  );
};

export default SubscriptionAlert;
