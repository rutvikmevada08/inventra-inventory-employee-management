const mongoose = require('mongoose');
const InventoryTransaction = require('../models/InventoryTransaction');
const LotItem = require('../models/LotItem');
const ItemType = require('../models/ItemType');
const ApiError = require('../utils/ApiError');
const { round3 } = require('../utils/money');

const oid = (id) => new mongoose.Types.ObjectId(String(id));

// Stock on hand for many item types: Map(itemTypeId -> { balance }).
async function balances(itemTypeIds) {
  const match = itemTypeIds ? { itemType: { $in: itemTypeIds.map(oid) } } : {};
  const rows = await InventoryTransaction.aggregate([
    { $match: match },
    { $group: { _id: { itemType: '$itemType', type: '$type' }, qty: { $sum: '$quantity' } } },
  ]);
  const map = new Map();
  for (const r of rows) {
    const key = String(r._id.itemType);
    const cur = map.get(key) || { balance: 0 };
    cur.balance += r._id.type === 'in' ? r.qty : -r.qty;
    map.set(key, cur);
  }
  for (const v of map.values()) v.balance = round3(v.balance);
  return map;
}

async function balanceOf(itemTypeId) {
  const map = await balances([itemTypeId]);
  return map.get(String(itemTypeId))?.balance || 0;
}

// The only function that writes to the ledger. Stock-out refuses to go below zero.
async function record({ itemType, type, quantity, source, date, lot, lotItem, itemRequest, reversalOf, note, createdBy }) {
  quantity = round3(quantity);
  if (!(quantity > 0)) throw new ApiError(400, 'Quantity must be greater than zero');
  if (type === 'out') {
    const available = await balanceOf(itemType);
    if (quantity > available + 1e-9) {
      throw new ApiError(409, `Insufficient stock. Available: ${available}, requested: ${quantity}`, { available });
    }
  }
  return InventoryTransaction.create({ itemType, type, quantity, source, date, lot, lotItem, itemRequest, reversalOf, note, createdBy });
}

// Stock-in for every stockable line of a lot. Safe to call twice: a line already
// received is skipped (and the sparse unique index backs this up).
async function receiveLot(lot, createdBy) {
  const lines = await LotItem.find({ lot: lot._id }).populate('itemType');
  const done = new Set(
    (await InventoryTransaction.find({ lot: lot._id, source: 'lot' }).select('lotItem').lean()).map((t) => String(t.lotItem))
  );
  const created = [];
  for (const line of lines) {
    if (!line.itemType?.isStockable || done.has(String(line._id))) continue;
    created.push(
      await record({
        itemType: line.itemType._id,
        type: 'in',
        quantity: line.quantity,
        source: 'lot',
        date: lot.purchaseDate,
        lot: lot._id,
        lotItem: line._id,
        note: `Received against invoice ${lot.invoiceNumber}`,
        createdBy,
      })
    );
  }
  return created;
}

// Used when a received lot is deactivated. Refuses if any of that stock has already
// been issued, because reversing it would push the balance below zero.
async function reverseLot(lot, createdBy) {
  const receipts = await InventoryTransaction.find({ lot: lot._id, source: 'lot' }).lean();
  const reversed = new Set(
    (await InventoryTransaction.find({ lot: lot._id, source: 'lot_reversal' }).select('reversalOf').lean()).map((t) => String(t.reversalOf))
  );
  const pending = receipts.filter((r) => !reversed.has(String(r._id)));
  const need = new Map();
  for (const r of pending) need.set(String(r.itemType), (need.get(String(r.itemType)) || 0) + r.quantity);
  const bal = await balances([...need.keys()]);
  for (const [id, qty] of need) {
    if (qty > (bal.get(id)?.balance || 0) + 1e-9) {
      throw new ApiError(409, 'Stock from this lot has already been issued, so it cannot be cancelled. Record an adjustment instead.');
    }
  }
  for (const r of pending) {
    await record({
      itemType: r.itemType, type: 'out', quantity: r.quantity, source: 'lot_reversal',
      lot: lot._id, reversalOf: r._id, note: `Lot ${lot.invoiceNumber} cancelled`, createdBy,
    });
  }
}

const isStockable = async (itemTypeId) => Boolean((await ItemType.findById(itemTypeId).lean())?.isStockable);

module.exports = { balances, balanceOf, record, receiveLot, reverseLot, isStockable };
