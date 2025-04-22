const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'aluno'),
    defaultValue: 'aluno'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // —— campos novos —— 
  status: {
    type: DataTypes.ENUM(
      'pending',
      'approved',
      'refused',
      'late',
      'expired',
      'refunded',
      'canceled'
    ),
    allowNull: false,
    defaultValue: 'pending'
  },
  mustResetPassword: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  hotmartPurchaseId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Hook to automatically manage active state based on status
User.beforeSave(async (user) => {
  // If status is changed, update active state accordingly
  if (user.changed('status')) {
    if (user.status === 'approved') {
      user.active = true;
    } 
    else if (['canceled', 'refunded', 'expired', 'refused'].includes(user.status)) {
      user.active = false;
    }
    // For other statuses like 'pending', don't automatically change active state
  }
});

// Método para verificar senha
User.prototype.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;
