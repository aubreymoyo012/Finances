// backend/src/migrations/0001-enable-pgtrgm.js
'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  },
  async down(queryInterface) {
    // await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS pg_trgm;');
  }
};
