// backend/src/utils/seedCategories.js
const db = require('../models');
const { Category } = db;

const DEFAULTS = [
  // expenses
  { name: 'Housing',       type: 'expense',  color: '#8E24AA', icon: 'home' },
  { name: 'Utilities',     type: 'expense',  color: '#42A5F5', icon: 'bolt' },
  { name: 'Groceries',     type: 'expense',  color: '#66BB6A', icon: 'cart' },
  { name: 'Transportation',type: 'expense',  color: '#26A69A', icon: 'car' },
  { name: 'Healthcare',    type: 'expense',  color: '#EF5350', icon: 'medkit' },
  { name: 'Entertainment', type: 'expense',  color: '#AB47BC', icon: 'gamepad' },
  { name: 'Dining Out',    type: 'expense',  color: '#FFA726', icon: 'utensils' },
  // savings (fixed: 'savings', not 'saving')
  { name: 'Savings',       type: 'savings',  color: '#66BB6A', icon: 'piggy-bank' },
  { name: 'Investments',   type: 'savings',  color: '#26A69A', icon: 'chart-line' },
  // income
  { name: 'Salary',        type: 'income',   color: '#29B6F6', icon: 'briefcase' },
  { name: 'Bonus',         type: 'income',   color: '#7E57C2', icon: 'gift' },
  { name: 'Freelance',     type: 'income',   color: '#26C6DA', icon: 'code' },
];

/**
 * Seed categories for a specific household.
 * @param {string} householdId
 * @returns {Promise<Array<Category>>} Created or found Category records
 */
async function seedCategories(householdId) {
  const created = [];
  for (const c of DEFAULTS) {
    const [cat] = await Category.findOrCreate({
      where: { householdId, name: c.name, type: c.type },
      defaults: { ...c, householdId, systemDefault: true }
    });
    created.push(cat);
  }
  return created; // <-- array of records (was counts)
}

module.exports = { seedCategories, DEFAULTS };
