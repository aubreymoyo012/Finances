const { Budget, Category, sequelize } = require('../models');
const { NotFoundError, InvalidInputError } = require('../utils/errors');

async function listBudgets(householdId, options = {}) {
  const { period, includeCategory = false } = options;
  
  const where = { householdId };
  if (period) where.period = period;

  const include = includeCategory ? [{
    model: Category,
    as: 'category',
    attributes: ['id', 'name', 'color', 'icon']
  }] : [];

  return Budget.findAll({
    where,
    include,
    order: [['createdAt', 'DESC']]
  });
}

async function getBudgetById(id, householdId) {
  const budget = await Budget.findOne({
    where: { id, householdId },
    include: [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'color', 'icon']
    }]
  });

  if (!budget) {
    throw new NotFoundError('Budget not found');
  }

  return budget;
}

async function createBudget(attrs) {
  const { householdId, categoryId, amount, period, startDate, endDate } = attrs;

  return sequelize.transaction(async (t) => {
    // Verify category exists and belongs to household
    const category = await Category.findOne({
      where: { id: categoryId, householdId },
      transaction: t
    });

    if (!category) {
      throw new InvalidInputError('Invalid category');
    }

    // Validate date range if both dates provided
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      throw new InvalidInputError('End date must be after start date');
    }

    return Budget.create({
      householdId,
      categoryId,
      amount,
      period,
      startDate,
      endDate
    }, { transaction: t });
  });
}

async function updateBudget(id, householdId, updates) {
  const { categoryId, ...otherUpdates } = updates;

  return sequelize.transaction(async (t) => {
    const budget = await Budget.findOne({
      where: { id, householdId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!budget) {
      throw new NotFoundError('Budget not found');
    }

    // If updating category, verify it exists and belongs to household
    if (categoryId && categoryId !== budget.categoryId) {
      const category = await Category.findOne({
        where: { id: categoryId, householdId },
        transaction: t
      });

      if (!category) {
        throw new InvalidInputError('Invalid category');
      }
    }

    // Validate date range if updating dates
    if (otherUpdates.startDate && otherUpdates.endDate && 
        new Date(otherUpdates.startDate) >= new Date(otherUpdates.endDate)) {
      throw new InvalidInputError('End date must be after start date');
    }

    await budget.update({
      ...otherUpdates,
      ...(categoryId ? { categoryId } : {})
    }, { transaction: t });

    return budget.reload({ transaction: t });
  });
}

async function deleteBudget(id, householdId) {
  return sequelize.transaction(async (t) => {
    const deleted = await Budget.destroy({
      where: { id, householdId },
      transaction: t
    });

    if (deleted === 0) {
      throw new NotFoundError('Budget not found');
    }

    return true;
  });
}

// Additional service methods
async function getBudgetSummary(householdId, period) {
  return sequelize.query(`
    SELECT 
      c.id as "categoryId",
      c.name as "categoryName",
      c.color as "categoryColor",
      SUM(b.amount) as "totalAmount",
      COUNT(b.id) as "budgetCount"
    FROM budgets b
    JOIN categories c ON b."categoryId" = c.id
    WHERE b."householdId" = :householdId
    AND b.period = :period
    GROUP BY c.id, c.name, c.color
    ORDER BY "totalAmount" DESC
  `, {
    replacements: { householdId, period },
    type: sequelize.QueryTypes.SELECT
  });
}

module.exports = {
  listBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetSummary
};