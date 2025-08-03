module.exports = (sequelize, DataTypes) => {
  const Budget = sequelize.define('Budget', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    period: {
      type: DataTypes.ENUM('monthly', 'weekly', 'yearly'),
      defaultValue: 'monthly',
    },
  });

  return Budget;
};
