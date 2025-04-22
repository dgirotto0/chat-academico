const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware para verificar token JWT
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Acesso não autorizado' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      // Não faça redirect, apenas retorne 401
      return res.status(401).json({ message: 'Token não fornecido' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }
    
    if (!user.active) {
      // Se a conta está inativa, verificar o status para mensagem mais informativa
      if (user.status === 'approved') {
        // Estranho: status é 'approved' mas conta está inativa - ativar automaticamente
        user.active = true;
        await user.save();
        console.log(`⚠️ Conta ativada automaticamente para usuário com status approved: ${user.email}`);
      } else {
        // Mensagem baseada no status atual
        let message = 'Conta desativada. Entre em contato com o administrador.';
        
        switch (user.status) {
          case 'refused':
            message = 'Seu pagamento foi recusado. Por favor, atualize suas informações de pagamento.';
            break;
          case 'refunded':
            message = 'Seu acesso foi encerrado devido a um reembolso. Entre em contato com o suporte.';
            break;
          case 'expired':
            message = 'Sua assinatura expirou. Por favor, renove sua assinatura para continuar.';
            break;
          case 'canceled':
            message = 'Sua assinatura foi cancelada. Para retomar o acesso, faça uma nova assinatura.';
            break;
        }
        
        return res.status(403).json({ 
          message: message,
          status: user.status,
          error: 'account_inactive'
        });
      }
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

// Middleware para verificar se é admin
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador' });
};

// Middleware para verificar reset de senha
exports.checkPasswordReset = (req, res, next) => {
  // Se usuário deve resetar senha, direciona para rota de reset
  if (req.user && req.user.mustResetPassword) {
    return res.status(307).json({ 
      message: 'É necessário alterar sua senha para continuar',
      redirectTo: '/reset-password'
    });
  }
  
  return next();
};
