const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // set to true for SQL query logs
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./User')(sequelize, Sequelize);
db.Household = require('./Household')(sequelize, Sequelize);
db.Transaction = require('./Transaction')(sequelize, Sequelize);
db.Category = require('./Category')(sequelize, Sequelize);
db.Budget = require('./Budget')(sequelize, Sequelize);
db.Receipt = require('./Receipt')(sequelize, Sequelize);
db.ReceiptItem = require('./ReceiptItem')(sequelize, Sequelize);

// Define associations below
db.User.belongsTo(db.Household);
db.Household.hasMany(db.User);

db.Transaction.belongsTo(db.User);
db.Transaction.belongsTo(db.Category);

db.Budget.belongsTo(db.Category);
db.Budget.belongsTo(db.Household);

db.Receipt.belongsTo(db.User);
db.Receipt.hasMany(db.ReceiptItem);

module.exports = db;
