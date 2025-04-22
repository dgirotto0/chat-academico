// migrations/20250420-create-hotmart-event-logs.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('HotmartEventLogs', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      purchaseId: { type: Sequelize.STRING, allowNull: false },
      eventType: { type: Sequelize.STRING, allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('HotmartEventLogs');
  }
};
