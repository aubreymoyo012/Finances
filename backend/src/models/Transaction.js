module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Amount must be a valid decimal number'
        },
        notZero(value) {
          if (parseFloat(value) === 0) {
            throw new Error('Amount cannot be zero');
          }
        }
      }
    },
    description: {
      type: DataTypes.STRING(255),
      validate: {
        len: {
          args: [0, 255],
          msg: 'Description cannot exceed 255 characters'
        }
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true,
        notInFuture(value) {
          if (new Date(value) > new Date()) {
            throw new Error('Transaction date cannot be in the future');
          }
        }
      }
    },
    type: {
      type: DataTypes.ENUM('income', 'expense', 'transfer'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['income', 'expense', 'transfer']],
          msg: 'Type must be income, expense, or transfer'
        }
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'recurring', 'cancelled'),
      defaultValue: 'completed'
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'other'),
      defaultValue: 'other'
    },
    referenceNumber: {
      type: DataTypes.STRING(50),
      comment: 'Bank reference or check number'
    },
    isTaxDeductible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    receiptId: {
      type: DataTypes.UUID,
      comment: 'Linked receipt document'
    },
    notes: {
      type: DataTypes.TEXT,
      comment: 'Additional transaction notes'
    }
  }, {
    timestamps: true,
    paranoid: true, // Enables soft deletion
    indexes: [
      {
        fields: ['date']
      },
      {
        fields: ['type']
      },
      {
        fields: ['categoryId'] // Foreign key index
      },
      {
        fields: ['userId'] // Foreign key index
      },
      {
        fields: ['householdId'] // Foreign key index
      }
    ],
    hooks: {
      beforeValidate: (transaction) => {
        if (transaction.description) {
          transaction.description = transaction.description.trim();
        }
      }
    }
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        allowNull: false
      },
      as: 'user'
    });
    
    Transaction.belongsTo(models.Category, {
      foreignKey: {
        name: 'categoryId',
        allowNull: false
      },
      as: 'category'
    });
    
    Transaction.belongsTo(models.Household, {
      foreignKey: {
        name: 'householdId',
        allowNull: false
      },
      as: 'household'
    });
    
    Transaction.belongsTo(models.Receipt, {
      foreignKey: 'receiptId',
      as: 'receipt'
    });
  };

  // Instance methods
  Transaction.prototype.getFormattedAmount = function() {
    return this.type === 'expense' ? -Math.abs(this.amount) : Math.abs(this.amount);
  };

  return Transaction;
};