const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WebhookEvent = sequelize.define('WebhookEvent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  eventId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'ID do evento fornecido pelo Hotmart'
  },
  eventType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Tipo do evento (ex: PURCHASE_APPROVED, SUBSCRIPTION_CANCELLATION)'
  },
  transactionCode: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Código da transação ou assinante'
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Email do usuário'
  },
  payload: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Payload completo do webhook em JSON'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Data e hora de processamento'
  }
}, {
  tableName: 'webhook_events',
  timestamps: true,
  indexes: [
    {
      unique: false,
      fields: ['eventType', 'transactionCode']
    },
    {
      unique: false,
      fields: ['userEmail']
    }
  ]
});

module.exports = WebhookEvent;
