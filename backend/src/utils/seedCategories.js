// Seeds default categories for a household.
// Returns an array of plain objects (toJSON), not counts.
const db = require('../models');

const DEFAULTS = [
  // expense
  { name: 'Groceries',  type: 'expense', color: '#66BB6A', icon: 'cart' },
  { name: 'Rent',       type: 'expense', color: '#EF5350', icon: 'home' },
  { name: 'Utilities',  type: 'expense', color: '#AB47BC', icon: 'bolt' },
  { name: 'Transport',  type: 'expense', color: '#FFA726', icon: 'bus' },
  { name: 'Dining Out', type: 'expense', color: '#26A69A', icon: 'utensils' },
  { name: 'Savings',    type: 'expense', color: '#8D6E63', icon: 'piggy-bank' }, // <- 'Savings' (not 'saving')
  // income
  { name: 'Salary',     type: 'income',  color: '#42A5F5', icon: 'bank' },
  { name: 'Interest',   type: 'income',  color: '#7E57C2', icon: 'percent' },
];

async function seedCategories(householdId) {
  if (!householdId) throw new Error('householdId is required to seed categories');

  const { Category } = db;
  const created = [];

  for (const def of DEFAULTS) {
    // unique per (householdId, name, type)
    const [cat] = await Category.findOrCreate({
      where: { householdId, name: def.name, type: def.type },
      defaults: { ...def, householdId },
    });
    created.push(cat.toJSON());
  }
  return created;
}

module.exports = { seedCategories, DEFAULTS };
