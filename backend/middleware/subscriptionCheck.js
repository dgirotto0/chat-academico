const { User } = require('../models');

// Middleware que verifica se a assinatura do usuário está ativa
exports.verifySubscriptionActive = async (req, res, next) => {
  try {
    // Usuário já foi carregado pelo middleware de autenticação
    const userId = req.user.id;
    
    // Buscar usuário com status atualizado (pode ter sido alterado desde o login)
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }
    
    // Admins sempre têm acesso, independente do status
    if (user.role === 'admin') {
      return next();
    }
    
    // Verificar status da assinatura
    const invalidStatuses = ['refused', 'refunded', 'expired', 'canceled'];
    
    if (invalidStatuses.includes(user.status)) {
      let message = 'Acesso não permitido.';
      
      switch (user.status) {
        case 'refused':
          message = 'Seu pagamento foi recusado. Por favor, atualize suas informações de pagamento.';
          break;
        case 'refunded':
          message = 'Infelizmente seu reembolso foi processado e o acesso foi encerrado.';
          break;
        case 'expired':
          message = 'Sua assinatura expirou. Por favor, renove sua assinatura para continuar acessando.';
          break;
        case 'canceled':
          message = 'Sua assinatura foi cancelada. Para retomar o acesso, por favor adquira uma nova assinatura.';
          break;
      }
      
      return res.status(403).json({
        message: message,
        status: user.status,
        error: 'subscription_inactive'
      });
    }
    
    // Status é aprovado ou pendente, permite acesso
    next();
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};
