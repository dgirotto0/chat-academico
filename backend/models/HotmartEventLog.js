const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HotmartEventLog = sequelize.define('HotmartEventLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  purchaseId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'purchase_id',
    comment: 'ID da transação ou código do assinante'
  },
  eventType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'event_type',
    comment: 'Tipo do evento (ex: PURCHASE_APPROVED, SUBSCRIPTION_CANCELLATION)'
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Payload completo do webhook'
  }
}, {
  tableName: 'hotmart_event_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['purchase_id', 'event_type'],
      unique: true
    }
  ]
});

module.exports = HotmartEventLog;
