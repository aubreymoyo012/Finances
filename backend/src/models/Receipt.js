// backend/src/models/Receipt.js
module.exports = (sequelize, DataTypes) => {
  const Receipt = sequelize.define('Receipt', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'userId'
    },
    store: {
      type: DataTypes.STRING,
      allowNull: true, // migration allows null
      validate: {
        len: { args: [0, 100], msg: 'Store name max 100 characters' }
      }
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true, // migration allows null
      validate: {
        isDecimal: { msg: 'Total must be a valid decimal number' },
        min(value) {
          if (value != null && parseFloat(value) < 0) {
            throw new Error('Total cannot be negative');
          }
        }
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: { isDate: true }
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isUrlOrRelative(v) {
          if (!v) throw new Error('imageUrl required');
          if (v.startsWith('/uploads/')) return; // allow our served path
          // optionally allow full http(s)
          if (!/^https?:\/\//i.test(v)) throw new Error('imageUrl must be a URL or /uploads/... path');
        }
      }
    }
  }, {
    tableName: 'receipts',
    underscored: false,
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['date'] },
      { fields: ['store'] },
      { fields: ['userId'] }
    ]
  });

  Receipt.associate = (models) => {
    Receipt.belongsTo(models.User, { foreignKey: { name: 'userId', allowNull: false }, as: 'user' });
    Receipt.hasMany(models.ReceiptItem, {
      foreignKey: { name: 'receiptId', allowNull: false },
      as: 'items',
      onDelete: 'CASCADE'
    });
  };

  return Receipt;
};
