// backend/src/migrations/0007-add-user-auth-columns.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { BOOLEAN, STRING, DATE } = Sequelize;
    const cols = await queryInterface.describeTable('users');

    // Ensure isVerified exists and matches the model (NOT NULL, default false)
    if (!cols.isVerified) {
      await queryInterface.addColumn('users', 'isVerified', {
        type: BOOLEAN, allowNull: false, defaultValue: false
      });
    } else if (cols.isVerified.allowNull || cols.isVerified.defaultValue == null) {
      await queryInterface.changeColumn('users', 'isVerified', {
        type: BOOLEAN, allowNull: false, defaultValue: false
      });
    }

    if (!cols.verificationToken) {
      await queryInterface.addColumn('users', 'verificationToken', {
        type: STRING, allowNull: true
      });
    }
    if (!cols.passwordResetToken) {
      await queryInterface.addColumn('users', 'passwordResetToken', {
        type: STRING, allowNull: true
      });
    }
    if (!cols.passwordResetExpires) {
      await queryInterface.addColumn('users', 'passwordResetExpires', {
        type: DATE, allowNull: true
      });
    }
  },

  async down(queryInterface) {
    // Non-destructive for isVerified (leave it in place)
    await queryInterface.removeColumn('users', 'verificationToken').catch(() => {});
    await queryInterface.removeColumn('users', 'passwordResetToken').catch(() => {});
    await queryInterface.removeColumn('users', 'passwordResetExpires').catch(() => {});
    // If you truly need to drop isVerified too, uncomment:
    // await queryInterface.removeColumn('users', 'isVerified').catch(() => {});
  }
};
