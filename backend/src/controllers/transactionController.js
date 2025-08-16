// backend/src/controllers/transactionController.js
const logger = require('../utils/logger');
const transactionService = require('../services/transactionService');

/**
 * Helper: normalize request user id (supports either userId or id on req.user)
 */
function getAuthUserId(req) {
  return req?.user?.userId || req?.user?.id || null;
}

/**
 * GET /transactions
 * Optionally supports basic filters via query params (service may ignore extras).
 */
exports.list = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const filters = {
      type: req.query.type,                // 'income' | 'expense'
      categoryId: req.query.categoryId,    // UUID
      from: req.query.from,                // ISO date
      to: req.query.to,                    // ISO date
      limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined
    };

    const transactions = await transactionService.listTransactions(userId, filters);
    res.json(transactions);
  } catch (error) {
    logger.error('Error listing transactions', error);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
};

/**
 * POST /transactions
 * body: { amount, type, date?, description?, categoryId }
 */
exports.create = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    // Routes should validate, but we still normalize here
    const { amount, type, date, description, categoryId } = req.body || {};

    const parsedAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (!Number.isFinite(parsedAmount)) {
      return res.status(400).json({ error: 'Amount must be a valid number' });
    }

    const payload = {
      userId,
      amount: parsedAmount,
      type,
      date: date ? new Date(date) : new Date(),
      description: typeof description === 'string' ? description.trim() : undefined,
      categoryId
    };

    const transaction = await transactionService.createTransaction(payload);
    res.status(201).json(transaction);
  } catch (error) {
    logger.error('Error creating transaction', error);
    res.status(500).json({ error: error.message || 'Failed to create transaction' });
  }
};

/**
 * PUT /transactions/:id
 * body: { amount, type, date?, description?, categoryId }
 */
exports.update = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params || {};
    if (!id) return res.status(400).json({ error: 'Transaction ID is required' });

    const { amount, type, date, description, categoryId } = req.body || {};

    const parsedAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (!Number.isFinite(parsedAmount)) {
      return res.status(400).json({ error: 'Amount must be a valid number' });
    }

    const updates = {
      amount: parsedAmount,
      type,
      date: date ? new Date(date) : undefined,
      description: typeof description === 'string' ? description.trim() : undefined,
      categoryId
    };

    const transaction = await transactionService.updateTransaction(id, userId, updates);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    res.json(transaction);
  } catch (error) {
    logger.error('Error updating transaction', error);
    res.status(500).json({ error: error.message || 'Failed to update transaction' });
  }
};

/**
 * DELETE /transactions/:id
 */
exports.delete = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params || {};
    if (!id) return res.status(400).json({ error: 'Transaction ID is required' });

    const success = await transactionService.deleteTransaction(id, userId);
    if (!success) return res.status(404).json({ error: 'Transaction not found' });

    res.sendStatus(204);
  } catch (error) {
    logger.error('Error deleting transaction', error);
    res.status(500).json({ error: error.message || 'Failed to delete transaction' });
  }
};
