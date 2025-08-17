// backend/src/models/Category.js
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,   // <-- generate UUID in app layer
      primaryKey: true,
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Category name cannot be empty' },
        len: { args: [2, 100], msg: 'Category name must be between 2 and 100 characters' }
      }
    },
    type: {
      type: DataTypes.STRING, // 'expense' | 'income'
      allowNull: false,
      defaultValue: 'expense'
    },
    color: { type: DataTypes.STRING, allowNull: true },
    icon:  { type: DataTypes.STRING, allowNull: true },
    // isActive: {                          // <-- present because your code referenced it
    //   type: DataTypes.BOOLEAN,
    //   allowNull: false,
    //   defaultValue: true
    // }
  }, {
    tableName: 'categories',
    underscored: false, // use camelCase column names (householdId, createdAt, etc.)
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['householdId'] }
    ]
  });

  Category.associate = (models) => {
    Category.belongsTo(models.Household, { foreignKey: 'householdId', as: 'household' });
    Category.hasMany(models.Transaction, { foreignKey: 'categoryId', as: 'transactions' });
    if (models.ReceiptItem) {
      Category.hasMany(models.ReceiptItem, { foreignKey: 'categoryId', as: 'items' });
    }
  };

  return Category;
};
