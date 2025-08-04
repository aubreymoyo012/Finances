module.exports = (sequelize, DataTypes) => {
  const Household = sequelize.define('Household', {
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
          msg: 'Household name cannot be empty'
        },
        len: {
          args: [2, 100],
          msg: 'Household name must be between 2 and 100 characters'
        }
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      validate: {
        isUppercase: true,
        len: [3, 3]
      }
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'UTC',
      validate: {
        notEmpty: true
      }
    },
    invitationCode: {
      type: DataTypes.STRING(8),
      unique: true,
      allowNull: true
    },
    invitationCodeExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    paranoid: true, // Enables soft deletion
    indexes: [
      {
        fields: ['name'],
        unique: true
      },
      {
        fields: ['invitationCode'],
        unique: true
      }
    ]
  });

  // Associations
  Household.associate = (models) => {
    Household.hasMany(models.User, {
      foreignKey: 'householdId',
      as: 'members'
    });
    Household.hasMany(models.Budget, {
      foreignKey: 'householdId',
      as: 'budgets'
    });
    Household.hasMany(models.Transaction, {
      foreignKey: 'householdId',
      as: 'transactions'
    });
    Household.hasMany(models.Category, {
      foreignKey: 'householdId',
      as: 'categories'
    });
  };

  // Hooks
  Household.beforeCreate(async (household) => {
    if (!household.invitationCode) {
      household.invitationCode = generateInvitationCode();
      household.invitationCodeExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    }
  });

  return Household;
};

// Helper function to generate invitation code
function generateInvitationCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}