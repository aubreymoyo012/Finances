// backend/src/models/Transaction.js
module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    householdId: { type: DataTypes.UUID, allowNull: true },
    categoryId: { type: DataTypes.UUID, allowNull: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'expense' },
    date: { type: DataTypes.DATE, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'transactions',
    underscored: false,
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['householdId', 'date'] },
      { fields: ['categoryId'] },
      { fields: ['type'] },
    ],
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User,      { foreignKey: 'userId',      as: 'user' });
    Transaction.belongsTo(models.Household, { foreignKey: 'householdId', as: 'household' });
    Transaction.belongsTo(models.Category,  { foreignKey: 'categoryId',  as: 'category' });
  };

  return Transaction;
};
