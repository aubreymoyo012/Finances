// backend/src/migrations/0002-receiptitems-name-trgm.js
'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS receipt_items_name_trgm_idx
      ON receipt_items
      USING GIN ("name" gin_trgm_ops);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS receipt_items_name_trgm_idx;
    `);
  }
};

