// migrations/20250420-add-hotmart-fields-to-users.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'status', {
      type: Sequelize.ENUM('pending','approved','refused','late','expired','refunded','canceled'),
      defaultValue: 'pending',
      allowNull: false
    });
    await queryInterface.addColumn('Users', 'mustResetPassword', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    await queryInterface.addColumn('Users', 'hotmartPurchaseId', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'hotmartPurchaseId');
    await queryInterface.removeColumn('Users', 'mustResetPassword');
    await queryInterface.removeColumn('Users', 'status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_Users_status;');
  }
};
