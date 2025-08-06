const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/database'); // ajuste conforme sua conexão

// Gerar token JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '24h'
  });
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Buscar usuário
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    
    const isValidPassword = await user.checkPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Atualizar último login
    await user.update({ lastLoginAt: new Date() });
    
    // Gerar token
    const token = generateToken(user.id);
    
    // Retornar dados do usuário sem senha
    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Registro
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Verificar se o email já existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }
    
    // Criar usuário
    const user = await User.create({
      name,
      email,
      password
    });
    
    // Gerar token
    const token = generateToken(user.id);
    
    // Retornar dados do usuário sem senha
    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Obter perfil do usuário
exports.getProfile = async (req, res) => {
  try {
    const { password: _, ...userWithoutPassword } = req.user.toJSON();
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Atualizar perfil
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = req.user;
    
    // Verificar se o email já existe (exceto para o próprio usuário)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email já está em uso' });
      }
    }
    
    // Atualizar campos
    if (name) user.name = name;
    if (email) user.email = email;
    
    await user.save();
    
    // Retornar usuário sem senha
    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.json({
      message: 'Perfil atualizado com sucesso',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Alterar senha
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;
    
    // Verificar senha atual
    const isValidPassword = await user.checkPassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Senha atual incorreta' });
    }
    
    // Atualizar senha
    user.password = newPassword;
    user.requirePasswordReset = false;
    await user.save();
    
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Esqueci a senha (placeholder)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Implementar lógica de envio de email para redefinição de senha
    res.json({ message: 'Email de redefinição enviado' });
  } catch (error) {
    console.error('Erro ao enviar email de redefinição:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Redefinir senha
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
  }

  try {
    // Buscar token na tabela
    const [result] = await db.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      { replacements: [token], type: db.QueryTypes.SELECT }
    );
    const resetToken = result && result[0] ? result[0] : result;

    if (!resetToken) {
      return res.status(400).json({ message: 'Token inválido ou expirado.' });
    }

    // Buscar usuário
    const user = await User.findByPk(resetToken.user_id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Atualizar senha e mustResetPassword
    user.password = await bcrypt.hash(newPassword, 10);
    user.mustResetPassword = false;
    await user.save();

    // Remover token usado
    await db.query(
      'DELETE FROM password_reset_tokens WHERE token = ?',
      { replacements: [token] }
    );

    return res.json({ message: 'Senha redefinida com sucesso.' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return res.status(500).json({ message: 'Erro interno ao redefinir senha.' });
  }
};

// Redefinir senha com token
exports.resetPasswordWithToken = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
  }

  try {
    // Buscar token na tabela
    const [result] = await db.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      { replacements: [token], type: db.QueryTypes.SELECT }
    );
    const resetToken = result && result[0] ? result[0] : result;

    if (!resetToken) {
      return res.status(400).json({ message: 'Token inválido ou expirado.' });
    }

    // Buscar usuário
    const user = await User.findByPk(resetToken.user_id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Atualizar senha e mustResetPassword
    user.password = await bcrypt.hash(newPassword, 10);
    user.mustResetPassword = false;
    await user.save();

    // Remover token usado
    await db.query(
      'DELETE FROM password_reset_tokens WHERE token = ?',
      { replacements: [token] }
    );

    return res.json({ message: 'Senha redefinida com sucesso.' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return res.status(500).json({ message: 'Erro interno ao redefinir senha.' });
  }
};

// Logout (placeholder)
exports.logout = async (req, res) => {
  try {
    // Implementar lógica de logout se necessário
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
