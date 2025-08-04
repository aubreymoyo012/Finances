const { Transaction, Category, sequelize } = require('../models');
const { NotFoundError, InvalidInputError } = require('../utils/errors');

/**
 * List transactions with filtering and pagination
 * @param {string} userId 
 * @param {Object} [options]
 * @param {number} [options.limit=20]
 * @param {number} [options.offset=0]
 * @param {Date} [options.startDate]
 * @param {Date} [options.endDate]
 * @param {string} [options.type]
 * @param {string} [options.categoryId]
 * @param {number} [options.minAmount]
 * @param {number} [options.maxAmount]
 * @returns {Promise<Array>}
 */
async function listTransactions(userId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    startDate,
    endDate,
    type,
    categoryId,
    minAmount,
    maxAmount
  } = options;

  const where = { userId };
  if (startDate) where.date = { [sequelize.Op.gte]: startDate };
  if (endDate) where.date = { ...where.date, [sequelize.Op.lte]: endDate };
  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;
  if (minAmount != null) where.amount = { [sequelize.Op.gte]: Math.abs(minAmount) };
  if (maxAmount != null) where.amount = { 
    ...where.amount, 
    [sequelize.Op.lte]: Math.abs(maxAmount) 
  };

  return Transaction.findAll({
    where,
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }],
    order: [['date', 'DESC'], ['createdAt', 'DESC']],
    limit,
    offset
  });
}

/**
 * Get transaction by ID with category details
 * @param {string} id 
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
async function getTransactionById(id, userId) {
  const transaction = await Transaction.findOne({
    where: { id, userId },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }]
  });

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  return transaction;
}

/**
 * Create a new transaction with validation
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.amount
 * @param {string} params.type
 * @param {Date|string} [params.date]
 * @param {string} [params.description]
 * @param {string} params.categoryId
 * @returns {Promise<Object>}
 */
async function createTransaction({ userId, amount, type, date, description, categoryId }) {
  return sequelize.transaction(async (t) => {
    // Validate category exists
    const category = await Category.findByPk(categoryId, { transaction: t });
    if (!category) {
      throw new InvalidInputError('Invalid category');
    }

    // Validate type matches category type
    if (category.type !== type) {
      throw new InvalidInputError(`Transaction type must match category type (${category.type})`);
    }

    // Convert amount based on type
    const absoluteAmount = Math.abs(parseFloat(amount));
    const transactionAmount = type === 'expense' ? -absoluteAmount : absoluteAmount;

    return Transaction.create({
      userId,
      amount: transactionAmount,
      type,
      date: date || new Date(),
      description: description?.trim(),
      categoryId
    }, { transaction: t });
  });
}

/**
 * Update transaction with validation
 * @param {string} id 
 * @param {string} userId 
 * @param {Object} updates 
 * @returns {Promise<Object>}
 */
async function updateTransaction(id, userId, updates) {
  return sequelize.transaction(async (t) => {
    const transaction = await Transaction.findOne({
      where: { id, userId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Handle amount/type updates
    if (updates.amount || updates.type) {
      const newType = updates.type || transaction.type;
      const newAmount = updates.amount != null ? 
        parseFloat(updates.amount) : 
        Math.abs(transaction.amount);
      
      updates.amount = newType === 'expense' ? -newAmount : newAmount;
    }

    // Validate category if being updated
    if (updates.categoryId) {
      const category = await Category.findByPk(updates.categoryId, { transaction: t });
      if (!category) {
        throw new InvalidInputError('Invalid category');
      }
      if (category.type !== (updates.type || transaction.type)) {
        throw new InvalidInputError(`Transaction type must match category type (${category.type})`);
      }
    }

    await transaction.update({
      ...updates,
      ...(updates.description ? { description: updates.description.trim() } : {})
    }, { transaction: t });

    return transaction.reload({
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color', 'icon']
      }],
      transaction: t
    });
  });
}

/**
 * Delete transaction
 * @param {string} id 
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
async function deleteTransaction(id, userId) {
  return sequelize.transaction(async (t) => {
    const deleted = await Transaction.destroy({
      where: { id, userId },
      transaction: t
    });

    if (deleted === 0) {
      throw new NotFoundError('Transaction not found');
    }

    return true;
  });
}

module.exports = {
  listTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction
};