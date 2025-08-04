// backend/src/controllers/budgetController.js
const { budgetService, categoryService } = require('../services');

exports.list = async (req, res) => {
  try {
    if (!req.user?.householdId) {
      return res.status(400).json({ error: 'Household ID is required' });
    }

    const budgets = await budgetService.findAll({
      where: { householdId: req.user.householdId },
      include: [categoryService]
    });
    
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to retrieve budgets' });
  }
};

exports.create = async (req, res) => {
  try {
    const { categoryId, amount, period } = req.body;

    if (!req.user?.householdId) {
      return res.status(400).json({ error: 'Household ID is required' });
    }
    if (!categoryId || !amount || !period) {
      return res.status(400).json({ 
        error: 'categoryId, amount, and period are required' 
      });
    }

    const budget = await budgetService.createBudget({
      householdId: req.user.householdId,
      categoryId,
      amount,
      period
    });
    
    res.status(201).json(budget);
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
};