const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { validationResult } = require('express-validator');

// Gerar token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES
  });
};

// Login
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    if (!user.active) {
      return res.status(401).json({ message: 'Conta desativada. Entre em contato com o administrador.' });
    }

    if (user.status && user.status !== 'approved') {
      return res.status(403).json({
        message:
          user.status === 'pending'   ? 'Seu pagamento está em processamento.' :
          user.status === 'refused'   ? 'Seu pagamento foi recusado.' :
          user.status === 'refunded'  ? 'Seu reembolso foi processado.' :
          user.status === 'expired'   ? 'Sua assinatura expirou.' :
          user.status === 'canceled'  ? 'Sua assinatura foi cancelada.' :
          'Acesso negado.',
        status: user.status
      });
    }

    // Tudo ok, emitir token
    const token = generateToken(user.id);
    // Log para depuração
    console.log('mustResetPassword do usuário:', user.mustResetPassword, 'tipo:', typeof user.mustResetPassword);
    return res.status(200).json({
      message: 'Login bem-sucedido',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        mustResetPassword: !!user.mustResetPassword // <-- sempre booleano!
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Obter perfil
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    // Inclua explicitamente o campo mustResetPassword
    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      active: user.active,
      mustResetPassword: !!user.mustResetPassword // <-- sempre booleano!
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Reset obrigatório de senha
exports.resetRequiredPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user.mustResetPassword) {
      return res.status(400).json({
        message: 'Redefinição de senha não é obrigatória para este usuário'
      });
    }

    const isMatch = await user.checkPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha atual incorreta' });
    }

    user.password = newPassword;
    user.mustResetPassword = false;
    await user.save();

    console.log(`Usuário ${user.email} completou a redefinição obrigatória de senha`);
    return res.status(200).json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao redefinir senha obrigatória:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Rota pública: esqueci minha senha
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Não revelar existência
      return res.status(200).json({
        message:
          'Se este email estiver cadastrado, você receberá instruções em breve.'
      });
    }

    // Corrija aqui: passe o sequelize como segundo argumento
    const { sequelize } = require('../models');
    await require('../services/emailService')
      .sendPasswordResetEmail(user, sequelize);

    return res.status(200).json({
      message:
        'Se este email estiver cadastrado, você receberá instruções em breve.'
    });
  } catch (error) {
    console.error('Erro ao solicitar recuperação de senha:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Rota pública: reset via token
exports.resetPasswordWithToken = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Token e nova senha são obrigatórios' });
    }

    // Verificar token na tabela password_reset_tokens
    const { sequelize } = require('../models');
    const [row] = await sequelize.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token=$1 AND used=FALSE AND expires_at>NOW()`,
      {
        bind: [token],
        type: sequelize.QueryTypes.SELECT
      }
    );
    if (!row) {
      return res.status(400).json({
        message: 'Token inválido ou expirado'
      });
    }

    const user = await User.findByPk(row.user_id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    user.password = newPassword;
    user.mustResetPassword = false;
    await user.save();

    await sequelize.query(
      `UPDATE password_reset_tokens SET used=TRUE WHERE id=$1`,
      { bind: [row.id] }
    );

    return res.status(200).json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};
