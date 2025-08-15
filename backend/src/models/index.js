const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const db = {
  Sequelize,
  sequelize,
  User: require('./User')(sequelize, Sequelize),
  Household: require('./Household')(sequelize, Sequelize),
  Transaction: require('./Transaction')(sequelize, Sequelize),
  Category: require('./Category')(sequelize, Sequelize),
  Budget: require('./Budget')(sequelize, Sequelize),
  Receipt: require('./Receipt')(sequelize, Sequelize),
  ReceiptItem: require('./ReceiptItem')(sequelize, Sequelize)
};

// Define associations
function setupAssociations() {
  // User-Household relationships
  db.User.belongsTo(db.Household, {
    foreignKey: {
      allowNull: false,
      name: 'householdId'
    },
    as: 'household'
  });
  
  db.Household.hasMany(db.User, {
    foreignKey: 'householdId',
    as: 'members'
  });

  // Transaction relationships
  db.Transaction.belongsTo(db.User, {
    foreignKey: {
      allowNull: false,
      name: 'userId'
    },
    as: 'user'
  });
  
  db.Transaction.belongsTo(db.Category, {
    foreignKey: {
      allowNull: false,
      name: 'categoryId'
    },
    as: 'category'
  });

  // Budget relationships
  db.Budget.belongsTo(db.Category, {
    foreignKey: {
      allowNull: false,
      name: 'categoryId'
    },
    as: 'category'
  });
  
  db.Budget.belongsTo(db.Household, {
    foreignKey: {
      allowNull: false,
      name: 'householdId'
    },
    as: 'household'
  });

  // Receipt relationships
  db.Receipt.belongsTo(db.User, {
    foreignKey: {
      allowNull: false,
      name: 'userId'
    },
    as: 'user'
  });
  
  db.Receipt.hasMany(db.ReceiptItem, {
    foreignKey: {
      allowNull: false,
      name: 'receiptId'
    },
    as: 'items',
    onDelete: 'CASCADE'
  });

  // Category-Household relationship (if categories are household-specific)
  db.Category.belongsTo(db.Household, {
    foreignKey: {
      allowNull: false,
      name: 'householdId'
    },
    as: 'household'
  });
}

setupAssociations();

// Test the database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ alter: true });
    //   console.log('Database synchronized');
    // }
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

testConnection();

module.exports = db;