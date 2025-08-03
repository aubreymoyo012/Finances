const { Transaction } = require('../models');

async function listTransactions(userId) {
  return Transaction.findAll({ where: { userId } });
}

async function createTransaction({ userId, amount, type, date, description, categoryId }) {
  if (type === 'expense' && amount > 0) {
    throw new Error('Expense amount must be negative');
  }
  return Transaction.create({ userId, amount, type, date, description, categoryId });
}

async function updateTransaction(id, userId, updates) {
  const tx = await Transaction.findOne({ where: { id, userId } });
  if (!tx) throw new Error('Not found');
  return tx.update(updates);
}

async function deleteTransaction(id, userId) {
  const tx = await Transaction.findOne({ where: { id, userId } });
  if (!tx) throw new Error('Not found');
  await tx.destroy();
  return true;
}

module.exports = {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
