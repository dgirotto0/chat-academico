const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware de autenticação
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Token de acesso necessário' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(401).json({ message: 'Token inválido' });
  }
};

// Middleware para verificar se o usuário precisa redefinir senha
const checkPasswordReset = (req, res, next) => {
  // Por enquanto apenas passa adiante, sem verificar colunas que não existem
  next();
};

// Middleware para verificar se o usuário é admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado: privilégios de administrador necessários' });
  }
  next();
};

module.exports = {
  authenticate,
  checkPasswordReset,
  requireAdmin
};
