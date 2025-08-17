'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING, DATE, INTEGER, BOOLEAN, DECIMAL } = Sequelize;

    // Describe existing columns
    const users = await queryInterface.describeTable('users');
    const receipts = await queryInterface.describeTable('receipts');

    // Add missing profile columns expected by your User model
    if (!users.isVerified) {
      await queryInterface.addColumn('users', 'isVerified', {
        type: BOOLEAN, allowNull: false, defaultValue: false
      });
    }
    if (!users.timezone) {
      await queryInterface.addColumn('users', 'timezone', {
        type: STRING, allowNull: false, defaultValue: 'UTC'
      });
    }
    if (!users.preferredCurrency) {
      await queryInterface.addColumn('users', 'preferredCurrency', {
        type: STRING(3), allowNull: false, defaultValue: 'USD'
      });
    }

    // Make name/email required; set role default to 'user'
    await queryInterface.changeColumn('users', 'name',  { type: STRING, allowNull: false });
    await queryInterface.changeColumn('users', 'email', { type: STRING, allowNull: false });
    await queryInterface.changeColumn('users', 'role',  { type: STRING, allowNull: false, defaultValue: 'user' });

    // Helpful FK index
    const idx = await queryInterface.showIndex('users');
    if (!idx.some(i => i.name === 'users_householdId')) {
      await queryInterface.addIndex('users', ['householdId'], { name: 'users_householdId' });
    }

    // Relax receipts.total to allow null (controller may omit it)
    if (receipts.total && receipts.total.allowNull === false) {
      await queryInterface.changeColumn('receipts', 'total', { type: DECIMAL(12,2), allowNull: true });
    }
  },

  async down(queryInterface, Sequelize) {
    const { STRING } = Sequelize;
    // Revert the strictness (non-destructive 'down')
    await queryInterface.changeColumn('users', 'name',  { type: STRING, allowNull: true });
    await queryInterface.changeColumn('users', 'email', { type: STRING, allowNull: true });
    await queryInterface.changeColumn('users', 'role',  { type: STRING, allowNull: false, defaultValue: 'member' });
    await queryInterface.removeIndex('users', 'users_householdId').catch(() => {});
    // (Keeping the added columns in down to avoid data loss)
  }
};
