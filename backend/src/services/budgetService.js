const { Budget } = require('../models');

async function listBudgets(householdId) {
  return Budget.findAll({ where: { householdId } });
}

async function createBudget({ householdId, categoryId, amount, period }) {
  return Budget.create({ householdId, categoryId, amount, period });
}

async function updateBudget(id, householdId, updates) {
  const b = await Budget.findOne({ where: { id, householdId } });
  if (!b) throw new Error('Not found');
  return b.update(updates);
}

async function deleteBudget(id, householdId) {
  const b = await Budget.findOne({ where: { id, householdId } });
  if (!b) throw new Error('Not found');
  await b.destroy();
  return true;
}

module.exports = { listBudgets, createBudget, updateBudget, deleteBudget };
