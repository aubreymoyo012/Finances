const { Budget, Category } = require('../models');

exports.list = async (req, res) => {
  const budgets = await Budget.findAll({
    where: { householdId: req.user.householdId },
    include: [Category]
  });
  res.json(budgets);
};

exports.create = async (req, res) => {
  const bud = await Budget.create({
    amount: req.body.amount,
    period: req.body.period || 'monthly',
    categoryId: req.body.categoryId,
    householdId: req.user.householdId
  });
  res.status(201).json(bud);
};
