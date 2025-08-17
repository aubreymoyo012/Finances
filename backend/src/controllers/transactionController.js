// backend/src/controllers/transactionController.js
const transactionService = require('../services/transactionService');

// Simple inline validation (kept intentionally minimal)
function validateTransactionPayload(body = {}) {
  const errors = [];

  // amount: required number > 0
  const amt = Number(body.amount);
  if (!Number.isFinite(amt) || amt <= 0) errors.push('amount must be a number > 0');

  // type: required; only 'expense' | 'income'
  const type = String(body.type || '').toLowerCase();
  if (!['expense', 'income'].includes(type)) errors.push("type must be 'expense' or 'income'");

  // date: optional; if present must be parsable
  if (body.date != null) {
    const d = new Date(body.date);
    if (Number.isNaN(d.getTime())) errors.push('date must be a valid date');
  }

  // categoryId: optional; if present must be a string-ish UUID (light check)
  if (body.categoryId != null) {
    const cid = String(body.categoryId);
    if (!/^[0-9a-fA-F-]{8,}$/.test(cid)) errors.push('categoryId must be a UUID');
  }

  return errors.length ? errors.join('; ') : null;
}

exports.list = async (req, res) => {
  try {
    const uid = req.user?.userId || req.user?.id;
    if (!uid) return res.status(401).json({ error: 'Authentication required' });

    const transactions = await transactionService.listTransactions(uid);
    res.json(transactions);
  } catch (error) {
    console.error('Error listing transactions:', error);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
};

exports.create = async (req, res) => {
  try {
    const uid = req.user?.userId || req.user?.id;
    const hid = req.user?.householdId;
    if (!uid) return res.status(401).json({ error: 'Authentication required' });
    if (!hid) return res.status(400).json({ error: 'Household ID is required' });

    const validationError = validateTransactionPayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { amount, type, date, description, categoryId } = req.body;

    const transaction = await transactionService.createTransaction({
      userId: uid,
      householdId: hid,                          // NOT NULL in DB
      amount: Number(amount),
      type,
      date: date ? new Date(date) : new Date(),  // default to now
      description: description?.trim(),
      categoryId: categoryId || null
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: error.message || 'Failed to create transaction' });
  }
};

exports.update = async (req, res) => {
  try {
    const uid = req.user?.userId || req.user?.id;
    const hid = req.user?.householdId;
    if (!uid) return res.status(401).json({ error: 'Authentication required' });
    if (!hid) return res.status(400).json({ error: 'Household ID is required' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Transaction ID is required' });

    const validationError = validateTransactionPayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { amount, type, date, description, categoryId } = req.body;

    const transaction = await transactionService.updateTransaction(
      id,
      uid,
      {
        householdId: hid,
        amount: Number(amount),
        type,
        date: date ? new Date(date) : new Date(),
        description: description?.trim(),
        categoryId: categoryId || null
      }
    );

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: error.message || 'Failed to update transaction' });
  }
};

exports.delete = async (req, res) => {
  try {
    const uid = req.user?.userId || req.user?.id;
    if (!uid) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Transaction ID is required' });

    const success = await transactionService.deleteTransaction(id, uid);
    if (!success) return res.status(404).json({ error: 'Transaction not found' });

    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: error.message || 'Failed to delete transaction' });
  }
};
