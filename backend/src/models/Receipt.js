module.exports = (sequelize, DataTypes) => {
  const Receipt = sequelize.define('Receipt', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    store: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Store name cannot be empty'
        },
        len: {
          args: [2, 100],
          msg: 'Store name must be between 2 and 100 characters'
        }
      }
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Total must be a valid decimal number'
        },
        min: {
          args: [0.01],
          msg: 'Total must be at least 0.01'
        }
      }
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      validate: {
        isDecimal: true,
        min: 0
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: {
          msg: 'Invalid date format'
        },
        isBefore: {
          args: [new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()], // Tomorrow
          msg: 'Date cannot be in the future'
        }
      }
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'credit_card', 'debit_card', 'mobile_payment', 'other'),
      defaultValue: 'credit_card'
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        // allow either absolute URL or /uploads/... local path
        isValidPathOrUrl(value) {
          const isLocal = typeof value === 'string' && value.startsWith('/uploads/');
          const isHttp = /^https?:\/\/.+/.test(value);
          if (!isLocal && !isHttp) throw new Error('Invalid image path or URL');
        }
      }
    },
    ocrRawText: {
      type: DataTypes.TEXT,
      comment: 'Raw OCR output for debugging'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verificationNotes: {
      type: DataTypes.TEXT
    }
  }, {
    timestamps: true,
    paranoid: true, // Enables soft deletion
    indexes: [
      {
        fields: ['date']
      },
      {
        fields: ['store']
      },
      {
        fields: ['userId'] // Assuming you'll add this association
      }
    ]
  });

  Receipt.associate = (models) => {
    Receipt.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        allowNull: false
      },
      as: 'user'
    });
    
    Receipt.hasMany(models.ReceiptItem, {
      foreignKey: {
        name: 'receiptId',
        allowNull: false
      },
      as: 'items',
      onDelete: 'CASCADE'
    });
    
    Receipt.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });
  };

  // Add hooks for business logic if needed
  Receipt.beforeValidate((receipt) => {
    if (receipt.imageUrl && !receipt.imageUrl.startsWith('http')) {
      receipt.imageUrl = `/uploads/${receipt.imageUrl}`;
    }
  });

  return Receipt;
};