'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Safety: ensure pg_trgm exists (idempotent, harmless if already enabled)
    await queryInterface.sequelize.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    // --- transactions ---
    await queryInterface.addIndex('transactions', ['householdId', 'date'], {
      name: 'transactions_household_date_idx',
    });
    await queryInterface.addIndex('transactions', ['categoryId'], {
      name: 'transactions_category_idx',
    });
    await queryInterface.addIndex('transactions', ['type'], {
      name: 'transactions_type_idx',
    });

    // --- budgets ---
    await queryInterface.addIndex('budgets', ['householdId', 'period'], {
      name: 'budgets_household_period_idx',
    });
    await queryInterface.addIndex('budgets', ['categoryId'], {
      name: 'budgets_category_idx',
    });

    // --- receipts ---
    await queryInterface.addIndex('receipts', ['userId', 'date'], {
      name: 'receipts_user_date_idx',
    });

    // --- categories ---
    // You already have a composite UNIQUE (householdId, name, type).
    // This helper index assists frequent household-scoped reads.
    await queryInterface.addIndex('categories', ['householdId'], {
      name: 'categories_household_idx',
    });

    // --- receipt_items (TRGM search by name) ---
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS receipt_items_name_trgm_idx
      ON receipt_items
      USING GIN ("name" gin_trgm_ops);
    `);
    await queryInterface.addIndex('receipt_items', ['receiptId'], {
      name: 'receipt_items_receipt_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('transactions', 'transactions_household_date_idx');
    await queryInterface.removeIndex('transactions', 'transactions_category_idx');
    await queryInterface.removeIndex('transactions', 'transactions_type_idx');

    await queryInterface.removeIndex('budgets', 'budgets_household_period_idx');
    await queryInterface.removeIndex('budgets', 'budgets_category_idx');

    await queryInterface.removeIndex('receipts', 'receipts_user_date_idx');

    await queryInterface.removeIndex('categories', 'categories_household_idx');

    await queryInterface.removeIndex('receipt_items', 'receipt_items_receipt_idx');
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS receipt_items_name_trgm_idx;`);
  }
};
