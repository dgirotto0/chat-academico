const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const File = sequelize.define('File', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  originalName: DataTypes.STRING,
  fileName: DataTypes.STRING,
  filePath: DataTypes.STRING,
  mimeType: DataTypes.STRING,
  size: DataTypes.INTEGER,
  content: DataTypes.TEXT,
  metadata: DataTypes.JSONB,
  processedAt: DataTypes.DATE,
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  MessageId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Messages',
      key: 'id'
    }
  }
}, {
  tableName: 'Files', // Corrigido para maiúsculo
  timestamps: true
});

module.exports = File;
