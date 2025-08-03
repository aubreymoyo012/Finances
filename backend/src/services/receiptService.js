// backend/src/services/receiptService.js
const { Receipt, ReceiptItem } = require('../models');

/**
 * List all receipts for a user, along with line items.
 */
async function listReceipts(userId) {
  return Receipt.findAll({
    where: { userId },
    include: [ReceiptItem],
    order: [['date', 'DESC'], ['createdAt', 'DESC']],
  });
}

/**
 * Create a new receipt along with its line items.
 * @param {Object} args
 * @param {string} args.userId - ID of the user uploading the receipt.
 * @param {string} [args.store]
 * @param {number|string} [args.total]
 * @param {Date|string} [args.date]
 * @param {string} args.imageUrl - File name/path.
 * @param {Array<{ name: string, quantity?: number, price?: number }>} args.items
 */
async function uploadReceipt({ userId, store, total, date, imageUrl, items }) {
  const receipt = await Receipt.create({
    userId,
    store: store || null,
    total: total != null ? total : null,
    date: date || new Date(),
    imageUrl
  });

  if (Array.isArray(items) && items.length > 0) {
    await Promise.all(
      items.map(item =>
        ReceiptItem.create({
          receiptId: receipt.id,
          name: item.name,
          quantity: item.quantity ?? 1,
          price: item.price ?? null
        })
      )
    );
  }

  return receipt;
}

module.exports = {
  listReceipts,
  uploadReceipt,
};
