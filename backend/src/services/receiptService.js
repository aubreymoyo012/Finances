const { Receipt, ReceiptItem, sequelize, Sequelize } = require('../models');
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
  if (startDate) where.date = { [Sequelize.Op.gte]: startDate };
  if (endDate) where.date = { ...where.date, [Sequelize.Op.lte]: endDate };
  if (store) where.store = { [Sequelize.Op.iLike]: `%${store}%` };

  return Receipt.findAll({
    where,
    order: [['date', 'DESC'], ['createdAt', 'DESC']],
    limit,
    offset,
    include: includeItems ? [{
      model: ReceiptItem,
      as: 'items',
      // IMPORTANT: use unitPrice & total (not price)
      attributes: ['id', 'name', 'quantity', 'unitPrice', 'total']
    }] : [],
    subQuery: false
  });
}

/**
 * Upload a receipt with parsed items
 * - Maps incoming item.price → unitPrice (back-compat)
 * - Computes total = quantity * unitPrice when possible
 * - Validates overall total if provided
 */
async function uploadReceipt({ userId, store, total, date, imageUrl, items = [] }) {
  return sequelize.transaction(async (t) => {
    // Validate total matches sum of items if both provided
    if (total != null && Array.isArray(items) && items.length > 0) {
      const itemsTotal = items.reduce((sum, item) => {
        const q = Number(item.quantity ?? 1);
        const p = item.unitPrice != null ? Number(item.unitPrice)
                : item.price     != null ? Number(item.price) // back-compat
                : 0;
        return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
      }, 0);
      if (Math.abs(itemsTotal - Number(total)) > 0.01) {
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

    if (Array.isArray(items) && items.length > 0) {
      const rows = items.map((item) => {
        const name = String(item.name || '').trim();
        const quantity = item.quantity != null ? parseFloat(item.quantity) : 1;
        const unitPrice = item.unitPrice != null ? parseFloat(item.unitPrice)
                        : item.price     != null ? parseFloat(item.price) // back-compat
                        : null;

        const totalComputed = (Number.isFinite(quantity) && Number.isFinite(unitPrice))
          ? Number((quantity * unitPrice).toFixed(2))
          : null;

        return {
          receiptId: receipt.id,
          name,
          quantity,
          // include unit only if your table has it; comment out if not present
          // unit: item.unit || 'each',
          unitPrice,
          total: item.total != null ? parseFloat(item.total) : totalComputed,
          categoryMatch: item.categoryMatch || null,
          // include these only if your table has them; otherwise remove:
          // isModified: !!item.isModified,
          // notes: item.notes || null,
        };
      });

      await ReceiptItem.bulkCreate(rows, { transaction: t });
    }

    return receipt.reload({
      include: [{
        model: ReceiptItem,
        as: 'items',
        attributes: ['id', 'name', 'quantity', 'unitPrice', 'total']
      }],
      transaction: t
    });
  });
}

/**
 * Get a single receipt
 */
async function getReceiptById(id, userId) {
  const receipt = await Receipt.findOne({
    where: { id, userId },
    include: [{
      model: ReceiptItem,
      as: 'items',
      attributes: ['id', 'name', 'quantity', 'unitPrice', 'total']
    }]
  });
  if (!receipt) throw new NotFoundError('Receipt not found');
  return receipt;
}

/**
 * Update receipt metadata
 */
async function updateReceipt(id, userId, updates) {
  return sequelize.transaction(async (t) => {
    const receipt = await Receipt.findOne({ where: { id, userId }, transaction: t });
    if (!receipt) throw new NotFoundError('Receipt not found');

    await receipt.update({
      store: typeof updates.store === 'string' ? updates.store.trim() : receipt.store,
      total: updates.total != null ? parseFloat(updates.total) : receipt.total,
      date: updates.date || receipt.date,
      status: updates.status || receipt.status
    }, { transaction: t });

    return receipt.reload({
      include: [{
        model: ReceiptItem,
        as: 'items',
        attributes: ['id', 'name', 'quantity', 'unitPrice', 'total']
      }],
      transaction: t
    });
  });
}

/**
 * Delete a receipt and its items
 */
async function deleteReceipt(id, userId) {
  return sequelize.transaction(async (t) => {
    const receipt = await Receipt.findOne({ where: { id, userId }, transaction: t });
    if (!receipt) throw new NotFoundError('Receipt not found');

    await ReceiptItem.destroy({ where: { receiptId: id }, transaction: t });
    await receipt.destroy({ transaction: t });
    return { ok: true };
  });
}

module.exports = {
  listReceipts,
  uploadReceipt,
  getReceiptById,
  updateReceipt,
  deleteReceipt
};