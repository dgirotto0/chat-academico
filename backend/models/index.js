// backend/models/index.js

const sequelize = require('../config/database');
const User = require('./User');
const Chat = require('./Chat');
const Message = require('./Message');
const File = require('./File');
const WebhookEvent = require('./WebhookEvent');
const HotmartEventLog = require('./HotmartEventLog');

// Definir as associações entre os modelos
User.hasMany(Chat, { onDelete: 'CASCADE' });
Chat.belongsTo(User);

Chat.hasMany(Message, { onDelete: 'CASCADE' });
Message.belongsTo(Chat);

Message.hasMany(File, { onDelete: 'CASCADE' });
File.belongsTo(Message);

// Exportar os modelos
module.exports = {
  sequelize,
  User,
  Chat,
  Message,
  File,
  WebhookEvent,
  HotmartEventLog
};
