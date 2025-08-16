// models/Category.js
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
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
          msg: 'Category name cannot be empty'
        },
        len: {
          args: [2, 50],
          msg: 'Category name must be between 2 and 50 characters'
        }
      }
    },
    type: {
      type: DataTypes.ENUM('expense', 'income', 'transfer', 'savings'),
      allowNull: false,
      defaultValue: 'expense',
      validate: {
        notEmpty: true
      }
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING(7), // For hex color codes (#RRGGBB)
      defaultValue: '#64748b', // A default slate-500 color
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i
      }
    },
    icon: {
      type: DataTypes.STRING,
      defaultValue: 'tag', // Default icon name
      validate: {
        notEmpty: true
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    systemDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'categories',   // IMPORTANT: matches migration
    underscored: true,  
    timestamps: true, // Adds createdAt and updatedAt
    paranoid: false, // Enables soft deletion
    indexes: [
      {
        unique: true,
        fields: ['householdId', 'name', 'type'],
        name: 'category_household_name_type_unique',
      },
    ],
  });

  // Associations
  Category.associate = (models) => {
    Category.hasMany(models.Transaction, {
      foreignKey: 'categoryId',
      as: 'transactions'
    });
    Category.hasMany(models.Budget, {
      foreignKey: 'categoryId',
      as: 'budgets'
    });
    // Category.belongsTo(models.User, {
    //   foreignKey: 'userId',
    //   as: 'user'
    // });
  };

  return Category;
};
