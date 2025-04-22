'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('hotmart_event_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      purchase_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      event_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Add a unique index to prevent duplicate event processing
    await queryInterface.addIndex('hotmart_event_logs', {
      fields: ['purchase_id', 'event_type'],
      unique: true,
      name: 'hotmart_event_logs_purchase_event_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('hotmart_event_logs');
  }
};
