// migrations/20240420000000-create-webhook-events.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1) Criar tabela webhook_events com colunas em camelCase
    await queryInterface.createTable('webhook_events', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      eventId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      eventType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      transactionCode: {
        type: Sequelize.STRING,
        allowNull: false
      },
      userEmail: {
        type: Sequelize.STRING,
        allowNull: false
      },
      payload: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      processedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
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

    // 2) Criar índices em camelCase (sem snake_case)
    await queryInterface.addIndex('webhook_events', {
      fields: ['eventType', 'transactionCode'],
      name: 'webhook_events_event_transaction_idx'
    });
    await queryInterface.addIndex('webhook_events', {
      fields: ['userEmail'],
      name: 'webhook_events_email_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índices criados
    await queryInterface.removeIndex('webhook_events', 'webhook_events_event_transaction_idx');
    await queryInterface.removeIndex('webhook_events', 'webhook_events_email_idx');
    // Excluir tabela
    await queryInterface.dropTable('webhook_events');
  }
};
