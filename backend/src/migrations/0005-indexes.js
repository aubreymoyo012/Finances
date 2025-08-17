// backend/src/migrations/0005-indexes.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const ensureIndex = async (table, name, fields, options = {}) => {
      const existing = await queryInterface.showIndex(table);
      if (!existing.find(i => i.name === name)) {
        await queryInterface.addIndex(table, fields, { name, ...options });
      }
    };

    // extensions (safe if already present)
    await queryInterface.sequelize.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    // --- transactions ---
    await ensureIndex('transactions', 'transactions_household_date_idx', ['householdId', 'date']);
    await ensureIndex('transactions', 'transactions_category_idx', ['categoryId']);
    await ensureIndex('transactions', 'transactions_type_idx', ['type']);

    // --- budgets ---
    await ensureIndex('budgets', 'budgets_household_period_idx', ['householdId', 'period']);
    await ensureIndex('budgets', 'budgets_category_idx', ['categoryId']);

    // --- receipts ---
    await ensureIndex('receipts', 'receipts_user_date_idx', ['userId', 'date']);

    // --- categories ---
    await ensureIndex('categories', 'categories_household_idx', ['householdId']);

    // --- receipt_items (TRGM search by name) ---
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS receipt_items_name_trgm_idx
      ON receipt_items USING GIN ("name" gin_trgm_ops);
    `);
    await ensureIndex('receipt_items', 'receipt_items_receipt_idx', ['receiptId']);
  },

  async down(queryInterface) {
    const drop = (name) => queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${name}"`);
    await drop('transactions_household_date_idx');
    await drop('transactions_category_idx');
    await drop('transactions_type_idx');
    await drop('budgets_household_period_idx');
    await drop('budgets_category_idx');
    await drop('receipts_user_date_idx');
    await drop('categories_household_idx');
    await drop('receipt_items_receipt_idx');
    await drop('receipt_items_name_trgm_idx');
  }
};
