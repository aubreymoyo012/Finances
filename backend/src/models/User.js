// backend/src/models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // Explicitly map every column to its exact DB name (camelCase)
    householdId: { type: DataTypes.UUID, allowNull: true, field: 'householdId' },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'email',
      validate: {
        isEmail: { msg: 'Please provide a valid email address' },
        notEmpty: true
      }
    },

    passwordHash: { type: DataTypes.STRING, allowNull: true, field: 'passwordHash' },

    // Virtual (not persisted) – we hash in the controller
    password: {
      type: DataTypes.VIRTUAL,
      set(v) { this.setDataValue('password', v); },
      validate: { len: { args: [8, 128], msg: 'Password must be between 8 and 128 characters' } }
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'name',
      validate: { notEmpty: true, len: { args: [2, 50], msg: 'Name must be between 2 and 50 characters' } }
    },

    role: {
      type: DataTypes.ENUM('user', 'admin', 'manager'),
      defaultValue: 'user',
      field: 'role',
      validate: { isIn: { args: [['user','admin','manager']], msg: 'Invalid user role' } }
    },

    googleId:            { type: DataTypes.STRING,  allowNull: true, field: 'googleId' },
    isVerified:          { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'isVerified' },
    verificationToken:   { type: DataTypes.STRING,  allowNull: true, field: 'verificationToken' },
    passwordResetToken:  { type: DataTypes.STRING,  allowNull: true, field: 'passwordResetToken' },
    passwordResetExpires:{ type: DataTypes.DATE,    allowNull: true, field: 'passwordResetExpires' },

    lastLoginAt:         { type: DataTypes.DATE,    allowNull: true, field: 'lastLoginAt' },
    loginAttempts:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'loginAttempts' },
    lockUntil:           { type: DataTypes.DATE,    allowNull: true, field: 'lockUntil' },

    profilePicture:      { type: DataTypes.STRING,  allowNull: true, field: 'profilePicture' },
    preferredCurrency:   { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD', field: 'preferredCurrency' },
    timezone:            { type: DataTypes.STRING,  allowNull: false, defaultValue: 'UTC',  field: 'timezone' },
  }, {
    tableName: 'users',
    underscored: false,     // <<< important
    timestamps: true,
    paranoid: false,
    indexes: [
      { fields: ['email'], unique: true, name: 'users_email_unique' },
      { fields: ['googleId'], unique: true, name: 'users_googleId_unique' },
      { fields: ['householdId'], name: 'users_householdId' },
    ],
    hooks: {
      beforeValidate: (u) => {
        if (u.email) u.email = String(u.email).toLowerCase().trim();
        if (u.name)  u.name  = String(u.name).trim();
      }
    },
    defaultScope: {
      attributes: { exclude: ['passwordHash','verificationToken','passwordResetToken','passwordResetExpires'] }
    }
  });

  User.associate = (models) => {
    User.belongsTo(models.Household, { foreignKey: 'householdId', as: 'household' });
    User.hasMany(models.Transaction, { foreignKey: 'userId', as: 'transactions' });
    User.hasMany(models.Receipt,     { foreignKey: 'userId', as: 'receipts' });
    User.hasMany(models.Budget,      { foreignKey: 'userId', as: 'budgets' });
  };

  User.prototype.isLocked = function () {
    return this.lockUntil && this.lockUntil.getTime() > Date.now();
  };

  return User;
};
