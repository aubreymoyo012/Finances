// backend/src/models/ReceiptItem.js
module.exports = (sequelize, DataTypes) => {
  const ReceiptItem = sequelize.define('ReceiptItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // exists in DB from migrations
    receiptId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Item name cannot be empty' },
        len: { args: [2, 100], msg: 'Item name must be between 2 and 100 characters' },
      },
    },

    // DB has INTEGER right now; change to DECIMAL via migration if you need fractional
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: { args: [1], msg: 'Quantity must be at least 1' } },
    },

    // match DB column names
    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Stored total (quantity * unitPrice)',
    },

    notes: {
      type: DataTypes.TEXT,
      comment: 'Additional notes about this item',
    },

    // convenience alias; not stored in DB
    totalPrice: {
      type: DataTypes.VIRTUAL(DataTypes.DECIMAL(12, 2), ['total', 'quantity', 'unitPrice']),
      get() {
        const t = this.get('total');
        if (t != null) return typeof t === 'string' ? t : String(t);
        const q = parseFloat(this.get('quantity'));
        const p = parseFloat(this.get('unitPrice'));
        return Number.isFinite(q * p) ? (q * p).toFixed(2) : null;
      },
    },
  }, {
    tableName: 'receipt_items',   // IMPORTANT: matches migration
    underscored: false,            // created_at/updated_at in snake_case
    timestamps: true,
    paranoid: false,              // you don’t have deletedAt in the table
    indexes: [
      // TRGM index is created by migration (keep it OUT of the model to avoid conflicts)
      { fields: ['receiptId'], name: 'receipt_items_receipt_idx' },
    ],
  });

  ReceiptItem.associate = (models) => {
    ReceiptItem.belongsTo(models.Receipt, {
      foreignKey: { name: 'receiptId', allowNull: false },
      as: 'receipt',
      onDelete: 'CASCADE',
    });

    // Uncomment after adding columns via migration (see optional migration below):
    // ReceiptItem.belongsTo(models.Category, { foreignKey: 'categoryId', as: 'category' });
    // ReceiptItem.belongsTo(models.Product,  { foreignKey: 'productId',  as: 'product' });
  };

  // clean-up + auto-compute stored total if not provided
  ReceiptItem.addHook('beforeValidate', (item) => {
    if (item.name) item.name = item.name.trim();
    if ((item.total == null || item.total === '') && item.quantity != null && item.unitPrice != null) {
      const q = parseFloat(item.quantity);
      const p = parseFloat(item.unitPrice);
      if (!Number.isNaN(q) && !Number.isNaN(p)) item.total = (q * p).toFixed(2);
    }
  });

  return ReceiptItem;
};
