const { Sequelize } = require('sequelize');
require('dotenv').config();

// Para Docker, usar variáveis de ambiente ou valores padrão
const dbConfig = {
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chat_academico',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres'
};


const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
