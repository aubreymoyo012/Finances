// backend/src/migrations/0002-create-core-tables.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Make sure required extensions exist (safe if already enabled)
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;'); // for gen_random_uuid()
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

    const { UUID, STRING, TEXT, DATE, DATEONLY, DECIMAL, INTEGER, BOOLEAN } = Sequelize;

    // households
    await queryInterface.createTable('households', {
      id: { type: UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      name: { type: STRING, allowNull: false },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });

    // users
    await queryInterface.createTable('users', {
      id: { type: UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      householdId: {
        type: UUID, allowNull: true,
        references: { model: 'households', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      name: { type: STRING, allowNull: true },
      email: { type: STRING, allowNull: true, unique: true },
      googleId: { type: STRING, allowNull: true, unique: true },
      passwordHash: { type: STRING, allowNull: true },
      role: { type: STRING, allowNull: false, defaultValue: 'member' },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });

    // categories (household-scoped with composite unique)
    await queryInterface.createTable('categories', {
      id: { type: UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      householdId: {
        type: UUID, allowNull: false,
        references: { model: 'households', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      name: { type: STRING, allowNull: false },
      type: { type: STRING, allowNull: false }, // 'income' | 'expense' | 'savings'
      color: { type: STRING, allowNull: true },
      icon: { type: STRING, allowNull: true },
      systemDefault: { type: BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });
    await queryInterface.addConstraint('categories', {
      fields: ['householdId', 'name', 'type'],
      type: 'unique',
      name: 'category_household_name_type_unique'
    });

    // budgets
    await queryInterface.createTable('budgets', {
      id: { type: UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      householdId: {
        type: UUID, allowNull: false,
        references: { model: 'households', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      categoryId: {
        type: UUID, allowNull: false,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      period: { type: STRING, allowNull: false }, // e.g., 'monthly'
      amount: { type: DECIMAL(12,2), allowNull: false },
      startDate: { type: DATEONLY, allowNull: true },
      endDate: { type: DATEONLY, allowNull: true },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });

    // transactions
    await queryInterface.createTable('transactions', {
      id: { type: UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      householdId: {
        type: UUID, allowNull: false,
        references: { model: 'households', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      userId: {
        type: UUID, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      categoryId: {
        type: UUID, allowNull: true, // allow null so onDelete SET NULL is legal
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      type: { type: STRING, allowNull: false }, // 'income' | 'expense'
      amount: { type: DECIMAL(12,2), allowNull: false },
      description: { type: TEXT, allowNull: true },
      date: { type: DATEONLY, allowNull: false, defaultValue: Sequelize.fn('now') },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });

    // receipts
    await queryInterface.createTable('receipts', {
      id: { type: UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      userId: {
        type: UUID, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      store: { type: STRING, allowNull: true },
      total: { type: DECIMAL(12,2), allowNull: false },
      paymentMethod: { type: STRING, allowNull: true },
      date: { type: DATEONLY, allowNull: false, defaultValue: Sequelize.fn('now') },
      imageUrl: { type: STRING, allowNull: false },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });

    // receipt_items
    await queryInterface.createTable('receipt_items', {
      id: { type: UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      receiptId: {
        type: UUID, allowNull: false,
        references: { model: 'receipts', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      name: { type: STRING, allowNull: false },
      quantity: { type: INTEGER, allowNull: false, defaultValue: 1 },
      unitPrice: { type: DECIMAL(12,2), allowNull: true },
      total: { type: DECIMAL(12,2), allowNull: true },
      notes: { type: TEXT, allowNull: true },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('receipt_items');
    await queryInterface.dropTable('receipts');
    await queryInterface.dropTable('transactions');
    await queryInterface.dropTable('budgets');
    await queryInterface.dropTable('categories');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('households');
  }
};
