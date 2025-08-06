// backend/models/index.js

const sequelize = require('../config/database');
const User = require('./User');
const Chat = require('./Chat');
const Message = require('./Message');
const File = require('./File');
const HotmartEventLog = require('./HotmartEventLog');

// Associações
User.hasMany(Chat, { foreignKey: 'UserId' });
Chat.belongsTo(User, { foreignKey: 'UserId' });

Chat.hasMany(Message, { foreignKey: 'ChatId' });
Message.belongsTo(Chat, { foreignKey: 'ChatId' });

Message.hasMany(File, { foreignKey: 'MessageId' });
File.belongsTo(Message, { foreignKey: 'MessageId' });

User.hasMany(File, { foreignKey: 'userId' });
File.belongsTo(User, { foreignKey: 'userId' });

// Exportar os modelos
module.exports = {
  sequelize,
  User,
  Chat,
  Message,
  File,
  HotmartEventLog
};
