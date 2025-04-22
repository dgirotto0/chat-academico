const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HotmartEventLog = sequelize.define('HotmartEventLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  purchaseId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  eventType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'HotmartEventLogs',
  timestamps: false,
  updatedAt: false
});

module.exports = HotmartEventLog;
