module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Please provide a valid email address'
        },
        notEmpty: {
          msg: 'Email cannot be empty'
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      validate: {
        len: {
          args: [8, 128],
          msg: 'Password must be between 8 and 128 characters'
        }
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Name cannot be empty'
        },
        len: {
          args: [2, 50],
          msg: 'Name must be between 2 and 50 characters'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'manager'),
      defaultValue: 'user',
      validate: {
        isIn: {
          args: [['user', 'admin', 'manager']],
          msg: 'Invalid user role'
        }
      }
    },
    googleId: {
      type: DataTypes.STRING,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verificationToken: {
      type: DataTypes.STRING
    },
    passwordResetToken: {
      type: DataTypes.STRING
    },
    passwordResetExpires: {
      type: DataTypes.DATE
    },
    lastLoginAt: {
      type: DataTypes.DATE
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockUntil: {
      type: DataTypes.DATE
    },
    profilePicture: {
      type: DataTypes.STRING,
      validate: {
        isUrl: {
          msg: 'Profile picture must be a valid URL'
        }
      }
    },
    preferredCurrency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      validate: {
        isUppercase: true,
        len: [3, 3]
      }
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'UTC'
    }
  }, {
    timestamps: true,
    paranoid: true, // Enables soft deletion
    indexes: [
      {
        fields: ['email'],
        unique: true
      },
      {
        fields: ['googleId'],
        unique: true,
        sparse: true // Allows null values for non-google users
      },
      {
        fields: ['householdId'] // Foreign key index
      }
    ],
    hooks: {
      beforeValidate: (user) => {
        if (user.email) {
          user.email = user.email.toLowerCase().trim();
        }
        if (user.name) {
          user.name = user.name.trim();
        }
      }
    },
    defaultScope: {
      attributes: {
        exclude: ['password', 'verificationToken', 'passwordResetToken', 'passwordResetExpires']
      }
    },
    scopes: {
      withSensitiveData: {
        attributes: { include: ['password', 'verificationToken'] }
      }
    }
  });

  User.associate = (models) => {
    User.belongsTo(models.Household, {
      foreignKey: 'householdId',
      as: 'household'
    });
    
    User.hasMany(models.Transaction, {
      foreignKey: 'userId',
      as: 'transactions'
    });
    
    User.hasMany(models.Receipt, {
      foreignKey: 'userId',
      as: 'receipts'
    });
    
    User.hasMany(models.Budget, {
      foreignKey: 'userId',
      as: 'budgets'
    });
  };

  // Instance methods
  User.prototype.isLocked = function() {
    return this.lockUntil > Date.now();
  };

  return User;
};