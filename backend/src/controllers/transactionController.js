// controllers/transactionController.js
const transactionService = require('../services/transactionService');
const { validateTransaction } = require('../validators/transactionValidator');

exports.list = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const transactions = await transactionService.listTransactions(req.user.id);
    res.json(transactions);
  } catch (error) {
    console.error('Error listing transactions:', error);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
};

exports.create = async (req, res) => {
  try {
    const { amount, type, date, description, categoryId } = req.body;

    // Validate user and input
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validationError = validateTransaction(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const transaction = await transactionService.createTransaction({
      userId: req.user.id,
      amount: parseFloat(amount),
      type,
      date: new Date(date),
      description: description?.trim(),
      categoryId
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create transaction' 
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, date, description, categoryId } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const validationError = validateTransaction(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const transaction = await transactionService.updateTransaction(
      id,
      req.user.id,
      {
        amount: parseFloat(amount),
        type,
        date: new Date(date),
        description: description?.trim(),
        categoryId
      }
    );

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update transaction' 
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const success = await transactionService.deleteTransaction(id, req.user.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to delete transaction' 
    });
  }
};