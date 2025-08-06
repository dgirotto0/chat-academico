require('dotenv').config({ path: '../.env' });
const { sequelize, User } = require('../models');

async function initDb() {
  try {
    console.log('Sincronizando banco de dados...');
    
    // sincroniza sem apagar tabelas existentes
    await sequelize.sync();
    
    console.log('Banco de dados sincronizado com sucesso!');
    
    // Criar usuário administrador inicial se não existir
    const [admin, created] = await User.findOrCreate({
      where: { email: 'admin@admin.com' },
      defaults: {
        name: 'Admin',
        email: 'admin@admin.com',
        password: 'admin123',
        role: 'admin',
        active: true,
        status: 'approved',
        mustResetPassword: false,
      }
    });
    console.log(created
      ? 'Usuário administrador criado com sucesso'
      : 'Usuário administrador já existe'
    );
    
    process.exit(0);
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
}

initDb();
