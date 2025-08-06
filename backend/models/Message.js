const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sender: {
    type: DataTypes.ENUM('user', 'assistant'),
    allowNull: false
  },
  generatedFile: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  ChatId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Chats',
      key: 'id'
    }
  }
}, {
  tableName: 'Messages',
  timestamps: true
});

module.exports = Message;
