// backend/src/services/transactionService.js
const db = require('../models');
const { Transaction } = db;

const pick = (p = {}) => {
  const { userId, householdId, categoryId, amount, type, date, description } = p;
  return {
    ...(userId ? { userId } : {}),
    ...(householdId ? { householdId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(amount != null ? { amount } : {}),
    ...(type ? { type } : {}),
    ...(date ? { date } : {}),
    ...(description != null ? { description } : {}),
  };
};

exports.listTransactions = async (userId) => {
  return Transaction.findAll({
    where: { userId },
    order: [['date', 'DESC'], ['createdAt', 'DESC']],
  });
};

exports.createTransaction = async (payload) => {
  return Transaction.create(pick(payload));
};

exports.updateTransaction = async (id, userId, payload) => {
  const [n, rows] = await Transaction.update(pick(payload), {
    where: { id, userId },
    returning: true,
  });
  return n ? rows[0] : null;
};

exports.deleteTransaction = async (id, userId) => {
  const n = await Transaction.destroy({ where: { id, userId } });
  return n > 0;
};
