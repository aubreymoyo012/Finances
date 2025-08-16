// models/Budget.js
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
      validate: {
        isDecimal: true,
        min: 0.01 // Assuming budget can't be zero or negative
      }
    },
    period: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'monthly',
      validate: { isIn: [['monthly','weekly','yearly','quarterly']] }
    },
    startDate: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    endDate: {
      type: DataTypes.DATEONLY,
      validate: {
        isDate: true,
        isAfterStartDate(value) {
          if (this.startDate && value <= this.startDate) {
            throw new Error('End date must be after start date');
          }
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'budgets',   // IMPORTANT: matches migration
    underscored: true,  
    timestamps: true, // Adds createdAt and updatedAt
    paranoid: false, // Adds deletedAt for soft deletes
    indexes: [
      {
        fields: ['householdId'] // Assuming you'll add this association
      },
      {
        fields: ['categoryId'] // Assuming you'll add this association
      }
    ]
  });

  // Add associations in the class method
  Budget.associate = (models) => {
    Budget.belongsTo(models.Household, { foreignKey: 'householdId' });
    Budget.belongsTo(models.Category, { foreignKey: 'categoryId', as: 'category' });
  };

  return Budget;
};