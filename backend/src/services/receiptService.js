const { Receipt, ReceiptItem, sequelize } = require('../models');
const { NotFoundError, InvalidInputError } = require('../utils/errors');

/**
 * List all receipts for a user with pagination and filtering options
 * @param {string} userId 
 * @param {Object} [options] 
 * @param {number} [options.limit=20] 
 * @param {number} [options.offset=0] 
 * @param {Date} [options.startDate] 
 * @param {Date} [options.endDate] 
 * @param {string} [options.store] 
 * @param {boolean} [options.includeItems=true] 
 * @returns {Promise<Array>} 
 */
async function listReceipts(userId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    startDate,
    endDate,
    store,
    includeItems = true
  } = options;

  const where = { userId };
  if (startDate) where.date = { [sequelize.Op.gte]: startDate };
  if (endDate) where.date = { ...where.date, [sequelize.Op.lte]: endDate };
  if (store) where.store = { [sequelize.Op.iLike]: `%${store}%` };

  return Receipt.findAll({
    where,
    include: includeItems ? [{
      model: ReceiptItem,
      as: 'items',
      attributes: ['id', 'name', 'quantity', 'price']
    }] : [],
    order: [['date', 'DESC'], ['createdAt', 'DESC']],
    limit,
    offset,
    subQuery: false
  });
}

/**
 * Get a single receipt by ID with its items
 * @param {string} id 
 * @param {string} userId 
 * @returns {Promise<Object>} 
 */
async function getReceiptById(id, userId) {
  const receipt = await Receipt.findOne({
    where: { id, userId },
    include: [{
      model: ReceiptItem,
      as: 'items',
      attributes: ['id', 'name', 'quantity', 'price']
    }]
  });

  if (!receipt) {
    throw new NotFoundError('Receipt not found');
  }

  return receipt;
}

/**
 * Create a new receipt with transaction safety and validation
 * @param {Object} args 
 * @param {string} args.userId 
 * @param {string} [args.store] 
 * @param {number} [args.total] 
 * @param {Date|string} [args.date] 
 * @param {string} args.imageUrl 
 * @param {Array} [args.items] 
 * @returns {Promise<Object>} 
 */
async function uploadReceipt({ userId, store, total, date, imageUrl, items = [] }) {
  return sequelize.transaction(async (t) => {
    // Validate total matches sum of items if both provided
    if (total != null && Array.isArray(items) && items.length > 0) {
      const itemsTotal = items.reduce((sum, item) => {
        return sum + (item.price || 0) * (item.quantity || 1);
      }, 0);

      if (Math.abs(itemsTotal - total) > 0.01) { // Allow small rounding differences
        throw new InvalidInputError('Receipt total does not match sum of items');
      }
    }

    const receipt = await Receipt.create({
      userId,
      store: store?.trim() || null,
      total: total != null ? parseFloat(total) : null,
      date: date || new Date(),
      imageUrl,
      status: 'processed'
    }, { transaction: t });

    if (items.length > 0) {
      await ReceiptItem.bulkCreate(
        items.map(item => ({
          receiptId: receipt.id,
          name: item.name.trim(),
          quantity: item.quantity ? parseFloat(item.quantity) : 1,
          price: item.price ? parseFloat(item.price) : null,
          categoryMatch: item.categoryMatch || null
        })),
        { transaction: t }
      );
    }

    return receipt.reload({
      include: [{
        model: ReceiptItem,
        as: 'items',
        attributes: ['id', 'name', 'quantity', 'price']
      }],
      transaction: t
    });
  });
}

/**
 * Update receipt metadata
 * @param {string} id 
 * @param {string} userId 
 * @param {Object} updates 
 * @returns {Promise<Object>} 
 */
async function updateReceipt(id, userId, updates) {
  return sequelize.transaction(async (t) => {
    const receipt = await Receipt.findOne({
      where: { id, userId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!receipt) {
      throw new NotFoundError('Receipt not found');
    }

    await receipt.update({
      store: updates.store?.trim() || null,
      total: updates.total != null ? parseFloat(updates.total) : null,
      date: updates.date || receipt.date,
      status: updates.status || receipt.status
    }, { transaction: t });

    return receipt.reload({
      include: [{
        model: ReceiptItem,
        as: 'items',
        attributes: ['id', 'name', 'quantity', 'price']
      }],
      transaction: t
    });
  });
}

/**
 * Delete a receipt and its items
 * @param {string} id 
 * @param {string} userId 
 * @returns {Promise<boolean>} 
 */
async function deleteReceipt(id, userId) {
  return sequelize.transaction(async (t) => {
    const deleted = await Receipt.destroy({
      where: { id, userId },
      transaction: t
    });

    if (deleted === 0) {
      throw new NotFoundError('Receipt not found');
    }

    return true;
  });
}

module.exports = {
  listReceipts,
  getReceiptById,
  uploadReceipt,
  updateReceipt,
  deleteReceipt
};