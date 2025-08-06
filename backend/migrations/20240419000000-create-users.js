'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('admin', 'aluno'),
        defaultValue: 'aluno'
      },
      active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      status: {
        type: Sequelize.ENUM('pending','approved','refused','late','expired','refunded','canceled'),
        defaultValue: 'pending',
        allowNull: false
      },
      mustResetPassword: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      hotmartPurchaseId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Users');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_Users_role;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_Users_status;');
  }
};
