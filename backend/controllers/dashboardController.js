const ItemType = require('../models/ItemType');
const ItemRequest = require('../models/ItemRequest');
const Reimbursement = require('../models/Reimbursement');
const Lot = require('../models/Lot');
const Vendor = require('../models/Vendor');
const FuelEntry = require('../models/FuelEntry');
const InventoryTransaction = require('../models/InventoryTransaction');
const stock = require('../services/stock');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/http');
const { round2 } = require('../utils/money');
const { sumField } = require('../utils/aggregate');

const active = { isActive: { $ne: false } };

exports.summary = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    const [openItemRequests, openReimbursements] = await Promise.all([
      ItemRequest.countDocuments({ requestedBy: req.user._id, status: 'requested' }),
      Reimbursement.countDocuments({ claimant: req.user._id, status: { $in: ['requested', 'approved'] }, ...active }),
    ]);
    return ok(res, { role: 'staff', openItemRequests, openReimbursements });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const fuelMatch = { ...active, date: { $gte: monthStart } };
  const [types, pendingItemRequests, pendingReimbursements, vendorCount, unpaidLots, fuelAmount, fuelLitres, recent] = await Promise.all([
    ItemType.find({ ...active, isStockable: { $ne: false } }).lean(),
    ItemRequest.countDocuments({ status: 'requested' }),
    Reimbursement.countDocuments({ status: 'requested', ...active }),
    Vendor.countDocuments(active),
    Lot.find({ ...active, paymentStatus: { $ne: 'paid' } }).select('totalPayable totalPaid').lean(),
    sumField(FuelEntry, fuelMatch, 'total'),
    sumField(FuelEntry, fuelMatch, 'litres'),
    InventoryTransaction.find().populate('itemType', 'name unit').sort({ createdAt: -1 }).limit(8).lean(),
  ]);

  const bal = await stock.balances(types.map((t) => t._id));
  const lowStock = types
    .map((t) => ({ _id: t._id, name: t.name, unit: t.unit, reorderLevel: t.reorderLevel, balance: bal.get(String(t._id))?.balance || 0 }))
    .filter((t) => t.reorderLevel > 0 && t.balance <= t.reorderLevel);

  ok(res, {
    role: 'admin',
    stockItemCount: types.length,
    lowStockCount: lowStock.length,
    lowStock: lowStock.slice(0, 8),
    pendingItemRequests,
    pendingReimbursements,
    vendorCount,
    outstandingToVendors: round2(unpaidLots.reduce((s, l) => s + (l.totalPayable - l.totalPaid), 0)),
    fuelThisMonth: { amount: round2(fuelAmount), litres: round2(fuelLitres) },
    recentMovements: recent,
  });
});
