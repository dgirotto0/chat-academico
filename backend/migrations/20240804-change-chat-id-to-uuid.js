'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Chats', 'id', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
      primaryKey: true
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Chats', 'id', {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    });
  }
};
