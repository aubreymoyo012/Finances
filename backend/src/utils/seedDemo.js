// backend/src/utils/seedDemo.js
const db = require('../models');
const { Household, User, Category, Budget, Transaction } = db;
const { seedCategories } = require('./seedCategories');

async function seedDemo() {
  // create demo household + user
  const hh = await Household.create({ name: 'Demo Household' });
  const user = await User.create({
    name: 'Demo User',
    email: 'demo@example.com',
    passwordHash: 'demo', // replace with a real hash in non-dev!
    householdId: hh.id
  });

  // seed household-scoped categories and use them
  const categories = await seedCategories(hh.id); // <-- array of Category instances

  const groceries = categories.find(c => c.name === 'Groceries' && c.type === 'expense');
  const salary    = categories.find(c => c.name === 'Salary'    && c.type === 'income');

  // demo transactions
  await Transaction.bulkCreate([
    {
      householdId: hh.id,
      userId: user.id,
      categoryId: groceries.id,
      type: 'expense',
      amount: -56.12,
      description: 'Weekly groceries',
      date: new Date()
    },
    {
      householdId: hh.id,
      userId: user.id,
      categoryId: salary.id,
      type: 'income',
      amount: 2400.00,
      description: 'Monthly salary',
      date: new Date()
    }
  ]);

  // demo budget
  await Budget.create({
    householdId: hh.id,
    categoryId: groceries.id,
    period: 'monthly',
    amount: 400,
    startDate: new Date(),
  });

  return { household: hh, user, categories };
}

module.exports = { seedDemo };
