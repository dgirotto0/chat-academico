const { User } = require('../models');

// Middleware para verificar se a assinatura está ativa
const verifySubscriptionActive = (req, res, next) => {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }
  
  // Admins sempre têm acesso
  if (user.role === 'admin') {
    return next();
  }
  
  // Verificar se a conta está ativa
  if (!user.active) {
    return res.status(403).json({ 
      message: 'Conta inativa. Entre em contato com o suporte.',
      error: 'account_inactive'
    });
  }
  
  // Verificar status da assinatura
  if (user.status !== 'approved') {
    let message = 'Acesso restrito devido ao status da assinatura.';
    
    switch (user.status) {
      case 'pending':
        message = 'Seu pagamento está sendo processado. Aguarde a confirmação.';
        break;
      case 'refused':
        message = 'Seu pagamento foi recusado. Por favor, atualize suas informações de pagamento.';
        break;
      case 'refunded':
        message = 'Sua assinatura foi reembolsada. Entre em contato com o suporte para mais informações.';
        break;
      case 'expired':
        message = 'Sua assinatura expirou. Renove para continuar usando o serviço.';
        break;
      case 'canceled':
        message = 'Sua assinatura foi cancelada. Assine novamente para continuar.';
        break;
    }
    
    return res.status(403).json({
      message,
      status: user.status,
      error: 'subscription_inactive'
    });
  }
  
  next();
};

module.exports = {
  verifySubscriptionActive
};
