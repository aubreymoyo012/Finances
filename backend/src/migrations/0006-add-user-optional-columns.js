// backend/src/migrations/0006-add-user-optional-columns.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DATE, INTEGER, STRING } = Sequelize;
    const cols = await queryInterface.describeTable('users');

    if (!cols.lastLoginAt) {
      await queryInterface.addColumn('users', 'lastLoginAt', { type: DATE, allowNull: true });
    }
    if (!cols.loginAttempts) {
      await queryInterface.addColumn('users', 'loginAttempts', { type: INTEGER, allowNull: false, defaultValue: 0 });
    }
    if (!cols.lockUntil) {
      await queryInterface.addColumn('users', 'lockUntil', { type: DATE, allowNull: true });
    }
    if (!cols.profilePicture) {
      await queryInterface.addColumn('users', 'profilePicture', { type: STRING, allowNull: true });
    }
    if (!cols.preferredCurrency) {
      await queryInterface.addColumn('users', 'preferredCurrency', { type: STRING(3), allowNull: false, defaultValue: 'USD' });
    }
  },

  async down(queryInterface) {
    // Non-destructive: keep columns if you've started using them
    // If you really need to drop, uncomment below lines carefully.
    // await queryInterface.removeColumn('users', 'lastLoginAt');
    // await queryInterface.removeColumn('users', 'loginAttempts');
    // await queryInterface.removeColumn('users', 'lockUntil');
    // await queryInterface.removeColumn('users', 'profilePicture');
    // await queryInterface.removeColumn('users', 'preferredCurrency');
  }
};
