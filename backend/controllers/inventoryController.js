const ItemType = require('../models/ItemType');
const InventoryTransaction = require('../models/InventoryTransaction');
const stock = require('../services/stock');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paging, pageMeta, escapeRegex, assertId, dateRange } = require('../utils/http');

// Stock on hand, built from the ledger. Item types are few, so sorting and paging happen after the join.
exports.stockList = asyncHandler(async (req, res) => {
  const filter = { isActive: { $ne: false }, isStockable: { $ne: false } };
  if (req.query.q) filter.name = new RegExp(escapeRegex(req.query.q), 'i');
  const types = await ItemType.find(filter).lean();
  const bal = await stock.balances(types.map((t) => t._id));

  let rows = types.map((t) => {
    const b = bal.get(String(t._id)) || { balance: 0 };
    return {
      _id: t._id, name: t.name, unit: t.unit, reorderLevel: t.reorderLevel,
      balance: b.balance, lastMovement: null,
      lowStock: t.reorderLevel > 0 && b.balance <= t.reorderLevel,
    };
  });
  if (req.query.lowStock === 'true') rows = rows.filter((r) => r.lowStock);
  const sorters = { balance: (a, b) => a.balance - b.balance, name: (a, b) => a.name.localeCompare(b.name) };
  rows.sort(sorters[req.query.sort] || sorters.name);

  const p = paging(req.query, 25);
  const pageRows = rows.slice(p.skip, p.skip + p.limit);
  await Promise.all(pageRows.map(async (r) => {
    const last = await InventoryTransaction.findOne({ itemType: r._id }).sort({ date: -1 }).select('date').lean();
    r.lastMovement = last?.date || null;
  }));
  ok(res, pageRows, { ...pageMeta(p, rows.length), lowStockCount: rows.filter((r) => r.lowStock).length });
});

exports.transactions = asyncHandler(async (req, res) => {
  const filter = { ...dateRange(req.query, 'date') };
  if (req.query.itemType) filter.itemType = assertId(req.query.itemType, 'item type');
  if (req.query.type) filter.type = req.query.type;
  if (req.query.source) filter.source = req.query.source;
  const p = paging(req.query);
  const [rows, total] = await Promise.all([
    InventoryTransaction.find(filter).populate('itemType', 'name unit').populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 }).skip(p.skip).limit(p.limit),
    InventoryTransaction.countDocuments(filter),
  ]);
  ok(res, rows, pageMeta(p, total));
});

// Manual correction (damage, count difference, opening stock). A reason is mandatory.
exports.adjust = asyncHandler(async (req, res) => {
  const { itemType, direction, quantity, reason } = req.body;
  if (!['in', 'out'].includes(direction)) throw new ApiError(400, 'Direction must be "in" or "out"');
  if (!reason || !String(reason).trim()) throw new ApiError(400, 'A reason is required for stock adjustments');
  const type = await ItemType.findById(assertId(itemType, 'item type'));
  if (!type || type.isActive === false) throw new ApiError(400, 'Item type not found');
  if (!type.isStockable) throw new ApiError(400, 'This item type is not tracked in stock');
  const txn = await stock.record({
    itemType: type._id, type: direction, quantity: Number(quantity), source: 'adjustment',
    note: String(reason).trim(), createdBy: req.user._id,
  });
  ok(res, txn, null, 201);
});
