const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const { Budget, Category, Transaction } = require('../models');

module.exports = async (db) => {
  try {
    // Create demo household
    const [household] = await db.Household.findOrCreate({
      where: { name: 'Demo Household' },
      defaults: {
        currency: 'USD',
        timezone: 'America/New_York'
      }
    });

    // Create demo user with hashed password
    const demoPassword = await bcrypt.hash('demo123', 10);
    const [user] = await db.User.findOrCreate({
      where: { email: 'demo@example.com' },
      defaults: {
        name: 'Demo User',
        password: demoPassword,
        isVerified: true,
        role: 'admin',
        profilePicture: faker.image.avatar()
      }
    });

    // Associate user with household
    await user.setHousehold(household);

    // Seed default categories if they don't exist
    const categorySeeder = require('./seedCategories');
    const categories = await categorySeeder(db.Category);

    // Create sample budgets
    const budgets = await Promise.all([
      Budget.create({
        householdId: household.id,
        categoryId: categories.find(c => c.name === 'Groceries').id,
        amount: 600,
        period: 'monthly'
      }),
      Budget.create({
        householdId: household.id,
        categoryId: categories.find(c => c.name === 'Utilities').id,
        amount: 300,
        period: 'monthly'
      })
    ]);

    // Create sample transactions
    const transactions = await Promise.all([
      Transaction.create({
        userId: user.id,
        householdId: household.id,
        categoryId: categories.find(c => c.name === 'Groceries').id,
        amount: -85.50,
        type: 'expense',
        description: 'Weekly grocery shopping',
        date: faker.date.recent({ days: 3 })
      }),
      Transaction.create({
        userId: user.id,
        householdId: household.id,
        categoryId: categories.find(c => c.name === 'Utilities').id,
        amount: -120.75,
        type: 'expense',
        description: 'Electric bill',
        date: faker.date.recent({ days: 10 })
      }),
      Transaction.create({
        userId: user.id,
        householdId: household.id,
        categoryId: categories.find(c => c.name === 'Salary').id,
        amount: 2500,
        type: 'income',
        description: 'Monthly salary',
        date: faker.date.recent({ days: 2 })
      })
    ]);

    console.log('Demo data seeded successfully:');
    console.log(`- Household: ${household.name}`);
    console.log(`- User: ${user.email}`);
    console.log(`- Categories: ${categories.length} seeded`);
    console.log(`- Budgets: ${budgets.length} created`);
    console.log(`- Transactions: ${transactions.length} created`);

    return {
      household,
      user,
      categories,
      budgets,
      transactions
    };
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
};