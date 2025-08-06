const { User, Chat, Message, File } = require('../models');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

// Listar todos os usuários
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    
    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Criar novo usuário
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    
    // Verificar se o email já existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }
    
    // Criar usuário
    const user = await User.create({
      name,
      email,
      password,
      role
    });
    
    // Retornar usuário sem senha
    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Atualizar usuário
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, active, mustResetPassword } = req.body;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
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
    if (role) user.role = role;
    if (typeof active === 'boolean') user.active = active;
    if (typeof mustResetPassword === 'boolean') user.mustResetPassword = mustResetPassword;
    
    await user.save();
    
    // Retornar usuário sem senha
    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.json({
      message: 'Usuário atualizado com sucesso',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Deletar usuário
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Não permitir deletar o próprio usuário admin
    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Não é possível deletar sua própria conta' });
    }
    
    await user.destroy();
    
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Estatísticas do sistema
exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalChats,
      totalMessages,
      totalFiles
    ] = await Promise.all([
      User.count(),
      Chat.count(),
      Message.count(),
      File.count()
    ]);
    
    res.json({
      users: totalUsers,
      chats: totalChats,
      messages: totalMessages,
      files: totalFiles
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
