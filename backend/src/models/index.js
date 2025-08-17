// backend/src/models/index.js
'use strict';

const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const basename = path.basename(__filename);

// Read DATABASE_URL (required)
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.SQL_DEBUG === 'true' ? console.log : false,
  define: {
    underscored: false,   // <<< important: DO NOT auto-snake_case columns
    freezeTableName: false,
    timestamps: true,
  }
});

const db = {};

// Only load models from this folder (avoid stray models elsewhere)
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.endsWith('.js') &&
      !file.endsWith('.test.js')
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
