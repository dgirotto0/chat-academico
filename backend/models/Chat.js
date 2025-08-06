const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Nova Conversa'
  },
  lastActivity: {
    type: DataTypes.DATE,
    allowNull: true
  },
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'Chats', // Especificar nome exato da tabela
  timestamps: true
});

module.exports = Chat;
