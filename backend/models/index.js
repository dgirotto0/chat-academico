const sequelize = require('../config/database');
const User = require('./User');
const Chat = require('./Chat');
const Message = require('./Message');
const File = require('./File');

// Definir relacionamentos
User.hasMany(Chat);
Chat.belongsTo(User);

Chat.hasMany(Message, { onDelete: 'CASCADE' });
Message.belongsTo(Chat);

// Definir relacionamento com cascata para excluir arquivos quando uma mensagem é excluída
Message.hasMany(File, { onDelete: 'CASCADE' });
File.belongsTo(Message);

module.exports = {
  sequelize,
  User,
  Chat,
  Message,
  File
};
