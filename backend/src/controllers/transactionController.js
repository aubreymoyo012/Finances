const { Transaction, Category, User } = require('../models');

exports.list = async (req, res) => {
  const txs = await transactionService.listTransactions(req.user.id);
  res.json(txs);
};

exports.create = async (req, res) => {
  const tx = await transactionService.createTransaction({
    userId: req.user.id,
    amount: req.body.amount,
    type: req.body.type,
    date: req.body.date,
    description: req.body.description,
    categoryId: req.body.categoryId,
  });
  res.status(201).json(tx);
};

// Add update and delete...
