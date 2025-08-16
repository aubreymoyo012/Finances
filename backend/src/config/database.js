// backend/src/config/database.js
require('dotenv').config();

const common = {
  url: process.env.DATABASE_URL,
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true'
      ? { require: true, rejectUnauthorized: false }
      : false,
  },
  logging: process.env.SEQUELIZE_LOG === 'true' ? console.log : false,
};

module.exports = ['development','test','production'].reduce((acc, env) => {
  acc[env] = {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: process.env.PGSSL === 'require'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {}
  };
  return acc;
}, {});