const { Category, sequelize } = require('../models');
const { NotFoundError, InvalidInputError } = require('../utils/errors');

async function listCategories(options = {}) {
  const { 
    householdId, 
    type, 
    includeInactive = false,
    includeCounts = false 
  } = options;

  const where = {};
  if (householdId) where.householdId = householdId;
  if (type) where.type = type;
  if (!includeInactive) where.isActive = true;

  const include = [];
  const attributes = { 
    exclude: ['createdAt', 'updatedAt', 'deletedAt'] 
  };

  if (includeCounts) {
    attributes.include = [
      [sequelize.literal('(SELECT COUNT(*) FROM transactions WHERE transactions."categoryId" = "Category"."id")'), 'transactionCount'],
      [sequelize.literal('(SELECT COUNT(*) FROM budgets WHERE budgets."categoryId" = "Category"."id")'), 'budgetCount']
    ];
  }

  return Category.findAll({
    where,
    attributes,
    include,
    order: [
      ['type', 'ASC'],
      ['name', 'ASC']
    ]
  });
}

async function getCategoryById(id, householdId = null) {
  const where = { id };
  if (householdId) where.householdId = householdId;

  const category = await Category.findOne({ where });

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  return category;
}

async function createCategory(data) {
  const { name, householdId, type = 'expense', color = '#64748b', icon = 'tag' } = data;

  return sequelize.transaction(async (t) => {
    // Check for duplicate name within the same household
    const existing = await Category.findOne({
      where: { 
        name,
        ...(householdId ? { householdId } : { householdId: null })
      },
      transaction: t
    });

    if (existing) {
      throw new InvalidInputError('Category with this name already exists');
    }

    return Category.create({
      name,
      type,
      color,
      icon,
      householdId,
      isActive: true
    }, { transaction: t });
  });
}

async function updateCategory(id, updates, householdId = null) {
  const { name, ...otherUpdates } = updates;

  return sequelize.transaction(async (t) => {
    const category = await Category.findOne({
      where: { 
        id,
        ...(householdId ? { householdId } : { householdId: null })
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check for duplicate name if updating
    if (name && name !== category.name) {
      const existing = await Category.findOne({
        where: { 
          name,
          ...(householdId ? { householdId } : { householdId: null })
        },
        transaction: t
      });

      if (existing) {
        throw new InvalidInputError('Category with this name already exists');
      }
    }

    await category.update({
      ...(name ? { name } : {}),
      ...otherUpdates
    }, { transaction: t });

    return category.reload({ transaction: t });
  });
}

async function deleteCategory(id, householdId = null) {
  return sequelize.transaction(async (t) => {
    const category = await Category.findOne({
      where: { 
        id,
        ...(householdId ? { householdId } : { householdId: null })
      },
      transaction: t
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check if category is used in transactions or budgets
    const transactionCount = await sequelize.models.Transaction.count({
      where: { categoryId: id },
      transaction: t
    });

    const budgetCount = await sequelize.models.Budget.count({
      where: { categoryId: id },
      transaction: t
    });

    if (transactionCount > 0 || budgetCount > 0) {
      // Soft-delete if in use
      await category.update({ isActive: false }, { transaction: t });
      return { message: 'Category deactivated as it is in use' };
    }

    // Hard delete if not in use
    await category.destroy({ transaction: t });
    return { message: 'Category deleted successfully' };
  });
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};