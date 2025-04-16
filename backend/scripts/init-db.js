require('dotenv').config({ path: '../.env' });
const { sequelize, User } = require('../models');

async function initDb() {
  try {
    console.log('Sincronizando banco de dados...');
    
    // Força a criação das tabelas
    await sequelize.sync({ force: true });
    
    console.log('Banco de dados sincronizado com sucesso!');
    
    // Criar usuário administrador inicial
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@admin.com',
      password: 'admin123', // Será automaticamente hasheado pelo hook beforeCreate
      role: 'admin',
      active: true
    });
    
    console.log('Usuário administrador criado com sucesso:');
    console.log(`Email: ${admin.email}`);
    console.log('Senha: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
}

initDb();
