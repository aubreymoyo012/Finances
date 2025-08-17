// backend/src/models/Household.js
module.exports = (sequelize, DataTypes) => {
  const Household = sequelize.define('Household', {
    id:   { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false }
  }, {
    tableName: 'households',
    underscored: false,
    timestamps: true,
    paranoid: false
  });

  Household.associate = (models) => {
    Household.hasMany(models.User,        { foreignKey: 'householdId', as: 'members' });
    Household.hasMany(models.Category,    { foreignKey: 'householdId', as: 'categories' });
    Household.hasMany(models.Budget,      { foreignKey: 'householdId', as: 'budgets' });
    Household.hasMany(models.Transaction, { foreignKey: 'householdId', as: 'transactions' });
  };

  return Household;
};
