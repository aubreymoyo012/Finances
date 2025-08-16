// backend/src/controllers/budgetController.js
const budgetService = require('../services/budgetService'); // fixed import

exports.list = async (req, res) => {
  try {
    if (!req.user?.householdId) {
      return res.status(400).json({ error: 'Household ID is required' });
    }
    const budgets = await budgetService.listBudgets(
      req.user.householdId,
      { includeCategory: true },
    );
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to retrieve budgets' });
  }
};

exports.create = async (req, res) => {
  try {
    if (!req.user?.householdId) {
      return res.status(400).json({ error: 'Household ID is required' });
    }
    const { categoryId, amount, period, startDate, endDate } = req.body;
    const budget = await budgetService.createBudget({
      householdId: req.user.householdId,
      categoryId,
      amount,
      period,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {})
    });
    res.status(201).json(budget);
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
};
