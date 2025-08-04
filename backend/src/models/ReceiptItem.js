module.exports = (sequelize, DataTypes) => {
  const ReceiptItem = sequelize.define('ReceiptItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Item name cannot be empty'
        },
        len: {
          args: [2, 100],
          msg: 'Item name must be between 2 and 100 characters'
        }
      }
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 3), // Supports fractional quantities (e.g., 0.5 kg)
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: {
          args: [0.001],
          msg: 'Quantity must be at least 0.001'
        }
      }
    },
    unit: {
      type: DataTypes.STRING(20), // e.g., 'kg', 'lb', 'each'
      defaultValue: 'each'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0.01],
          msg: 'Price must be at least 0.01'
        }
      }
    },
    totalPrice: {
      type: DataTypes.VIRTUAL,
      get() {
        return (this.getDataValue('quantity') * this.getDataValue('price')).toFixed(2);
      }
    },
    categoryMatch: {
      type: DataTypes.STRING,
      comment: 'Auto-matched category for this item'
    },
    isModified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Flag if item was manually modified from OCR result'
    },
    notes: {
      type: DataTypes.TEXT,
      comment: 'Additional notes about this item'
    }
  }, {
    timestamps: true,
    paranoid: true, // Enables soft deletion
    indexes: [
      {
        fields: ['receiptId'] // Foreign key index
      },
      {
        fields: ['name'],
        using: 'gin',
        operator: 'gin_trgm_ops' // Enables fuzzy text search (requires pg_trgm extension)
      }
    ]
  });

  ReceiptItem.associate = (models) => {
    ReceiptItem.belongsTo(models.Receipt, {
      foreignKey: {
        name: 'receiptId',
        allowNull: false
      },
      as: 'receipt',
      onDelete: 'CASCADE'
    });
    
    ReceiptItem.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });
    
    ReceiptItem.belongsTo(models.Product, { // Optional: if you have a product catalog
      foreignKey: 'productId',
      as: 'product'
    });
  };

  // Hooks for business logic
  ReceiptItem.beforeValidate((item) => {
    if (item.name) {
      item.name = item.name.trim();
    }
    // Auto-calculate total price if not set
    if (item.price && item.quantity && !item.totalPrice) {
      item.totalPrice = item.price * item.quantity;
    }
  });

  return ReceiptItem;
};