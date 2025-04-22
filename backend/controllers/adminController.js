const { User, Chat, Message } = require('../models');
const { validationResult } = require('express-validator');

// Listar todos os usuários (apenas admin)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'active', 'status', 'createdAt', 'mustResetPassword']
    });
    
    return res.status(200).json(users);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Criar novo usuário (apenas para admin)
exports.createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, email, password, role } = req.body;
    
    // Verificar se o email já está em uso
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Este email já está em uso' });
    }
    
    // Criar novo usuário
    const newUser = await User.create({
      name,
      email,
      password,
      role: role || 'aluno' // Default é 'aluno'
    });
    
    // Remover a senha da resposta
    const userResponse = { ...newUser.get(), password: undefined };
    
    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: userResponse
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Atualizar usuário (apenas para admin)
exports.updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const { name, email, role, active } = req.body;
    
    // Buscar o usuário
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o email já está em uso (por outro usuário)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Este email já está em uso' });
      }
    }
    
    // Atualizar usuário
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (active !== undefined) user.active = active;
    
    await user.save();
    
    // Remover a senha da resposta
    const userResponse = { ...user.get(), password: undefined };
    
    return res.status(200).json({
      message: 'Usuário atualizado com sucesso',
      user: userResponse
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Excluir usuário (apenas para admin)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar o usuário
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se não está tentando excluir a si mesmo
    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Não é possível excluir sua própria conta' });
    }
    
    // Excluir usuário
    await user.destroy();
    
    return res.status(200).json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};
