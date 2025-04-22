const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Transaction extends Model {
    static associate(models) {
      // Associação com o usuário
      Transaction.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }

  Transaction.init({
    transactionId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'ID da transação fornecido pela plataforma de pagamento'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID do usuário associado à transação'
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Tipo de evento (PURCHASE_APPROVED, SUBSCRIPTION_CANCELLATION, etc.)'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Status da transação (approved, refunded, canceled, etc.)'
    },
    data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Payload completo do webhook em formato JSON'
    },
    processed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Indica se a transação foi processada com sucesso'
    }
  }, {
    sequelize,
    modelName: 'Transaction',
    timestamps: true
  });

  return Transaction;
};
