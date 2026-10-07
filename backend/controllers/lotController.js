const Lot = require('../models/Lot');
const LotItem = require('../models/LotItem');
const Vendor = require('../models/Vendor');
const ItemType = require('../models/ItemType');
const InventoryTransaction = require('../models/InventoryTransaction');
const stock = require('../services/stock');
const { discardUpload } = require('../middleware/upload');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paging, pageMeta, escapeRegex, assertId, pick, dateRange, activeFilter } = require('../utils/http');
const { round2, round3 } = require('../utils/money');

const truthy = (v) => v === true || v === 'true' || v === 'on' || v === '1';
const POPULATE = [{ path: 'vendor', select: 'name' }];

function parseItems(raw) {
  let items = raw;
  if (typeof raw === 'string') {
    try { items = JSON.parse(raw); } catch { throw new ApiError(400, 'Items must be a valid list'); }
  }
  if (!Array.isArray(items) || !items.length) throw new ApiError(400, 'A lot needs at least one item');
  return items.map((it, i) => {
    const quantity = Number(it.quantity);
    const costPerUnit = Number(it.costPerUnit);
    if (!it.itemType) throw new ApiError(400, `Item ${i + 1}: item type is required`);
    if (!(quantity > 0)) throw new ApiError(400, `Item ${i + 1}: quantity must be greater than zero`);
    if (!(costPerUnit >= 0)) throw new ApiError(400, `Item ${i + 1}: cost cannot be negative`);
    return { itemType: assertId(it.itemType, 'item type'), quantity: round3(quantity), costPerUnit: round2(costPerUnit), totalPayable: round2(quantity * costPerUnit) };
  });
}

async function findLot(id) {
  const lot = await Lot.findById(assertId(id));
  if (!lot) throw new ApiError(404, 'Lot not found');
  return lot;
}

exports.list = asyncHandler(async (req, res) => {
  const filter = { ...activeFilter(req.query), ...dateRange(req.query, 'purchaseDate') };
  if (req.query.vendor) filter.vendor = assertId(req.query.vendor, 'vendor');
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.received) filter.received = truthy(req.query.received);
  if (req.query.q) filter.invoiceNumber = new RegExp(escapeRegex(req.query.q), 'i');
  const sort = { amount: { totalPayable: -1 }, oldest: { purchaseDate: 1 } }[req.query.sort] || { purchaseDate: -1 };
  const p = paging(req.query);
  const [rows, total] = await Promise.all([
    Lot.find(filter).populate(POPULATE).sort(sort).skip(p.skip).limit(p.limit),
    Lot.countDocuments(filter),
  ]);
  ok(res, rows, pageMeta(p, total));
});

exports.get = asyncHandler(async (req, res) => {
  const lot = await findLot(req.params.id);
  await lot.populate(POPULATE);
  const items = await LotItem.find({ lot: lot._id }).populate('itemType', 'name unit isStockable');
  const movements = await InventoryTransaction.find({ lot: lot._id }).sort({ createdAt: 1 }).lean();
  ok(res, { ...lot.toJSON(), items, movements });
});

exports.create = asyncHandler(async (req, res) => {
  try {
    const b = req.body;
    const items = parseItems(b.items);
    const vendor = await Vendor.findById(assertId(b.vendor, 'vendor'));
    if (!vendor || vendor.isActive === false) throw new ApiError(400, 'Vendor not found');

    const types = await ItemType.find({ _id: { $in: items.map((i) => i.itemType) } }).lean();
    if (new Set(items.map((i) => String(i.itemType))).size !== types.length) throw new ApiError(400, 'One or more item types do not exist');
    if (types.some((t) => t.isActive === false)) throw new ApiError(400, 'One or more item types have been deactivated');

    const sum = round2(items.reduce((s, i) => s + i.totalPayable, 0));
    const totalPayable = b.totalPayable !== undefined && b.totalPayable !== '' ? round2(b.totalPayable) : sum;
    const initialPaid = round2(b.totalPaid || 0);
    if (!(totalPayable >= 0)) throw new ApiError(400, 'Total payable is not valid');
    if (!(initialPaid >= 0) || initialPaid > totalPayable) throw new ApiError(400, 'Amount paid cannot be negative or exceed the total payable');

    const duplicate = await Lot.findOne({ vendor: vendor._id, invoiceNumber: String(b.invoiceNumber || '').trim(), isActive: { $ne: false } }).lean();
    if (duplicate) throw new ApiError(409, 'A lot with this invoice number already exists for this vendor');

    const lot = new Lot({
      ...pick(b, ['purchaseDate', 'invoiceNumber', 'lotType', 'paidBy', 'description']),
      vendor: vendor._id,
      totalPayable,
      totalPaid: initialPaid,
      payments: initialPaid > 0 ? [{ amount: initialPaid, date: b.purchaseDate, note: 'Paid at purchase', recordedBy: req.user._id }] : [],
      invoiceFile: req.file?.filename,
      createdBy: req.user._id,
    });
    await lot.save();

    try {
      await LotItem.insertMany(items.map((i) => ({ ...i, lot: lot._id })));
      if (truthy(b.received)) {
        lot.received = true;
        lot.receivedAt = new Date();
        await lot.save();
        await stock.receiveLot(lot, req.user._id);
      }
    } catch (err) {
      // No multi-document transactions on a standalone MongoDB, so undo by hand.
      await LotItem.deleteMany({ lot: lot._id });
      await Lot.deleteOne({ _id: lot._id });
      throw err;
    }
    await lot.populate(POPULATE);
    ok(res, lot, null, 201);
  } catch (err) {
    discardUpload(req.file);
    throw err;
  }
});

exports.update = asyncHandler(async (req, res) => {
  const lot = await findLot(req.params.id);
  const data = pick(req.body, ['purchaseDate', 'invoiceNumber', 'lotType', 'paidBy', 'description', 'totalPayable']);
  if (data.totalPayable !== undefined) data.totalPayable = round2(data.totalPayable);
  lot.set(data);
  await lot.save();
  ok(res, lot);
});

exports.replaceInvoice = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose a file to upload');
  const lot = await findLot(req.params.id);
  lot.invoiceFile = req.file.filename; // the previous file stays on disk
  await lot.save();
  ok(res, lot);
});

exports.receive = asyncHandler(async (req, res) => {
  const lot = await findLot(req.params.id);
  if (lot.isActive === false) throw new ApiError(409, 'This lot has been cancelled');
  if (lot.received) throw new ApiError(409, 'This lot is already marked as received');
  lot.received = true;
  lot.receivedAt = new Date();
  await lot.save();
  await stock.receiveLot(lot, req.user._id);
  ok(res, lot);
});

async function appendPayment(lot, { amount, date, method, reference, note }, userId) {
  amount = round2(amount);
  if (!(amount > 0)) throw new ApiError(400, 'Payment must be greater than zero');
  if (amount > lot.balance + 0.005) throw new ApiError(400, `Payment exceeds the outstanding balance of ${lot.balance}`);
  lot.payments.push({ amount, date: date || new Date(), method, reference, note, recordedBy: userId });
  lot.totalPaid = round2(lot.payments.reduce((s, p) => s + p.amount, 0));
  return lot.save();
}

exports.addPayment = asyncHandler(async (req, res) => {
  const lot = await findLot(req.params.id);
  if (lot.isActive === false) throw new ApiError(409, 'This lot has been cancelled');
  ok(res, await appendPayment(lot, req.body, req.user._id), null, 201);
});

// The old "mark as clear" button: pays whatever is left, but as a recorded payment.
exports.markClear = asyncHandler(async (req, res) => {
  const lot = await findLot(req.params.id);
  if (lot.balance <= 0) throw new ApiError(409, 'This lot is already fully paid');
  ok(res, await appendPayment(lot, { ...req.body, amount: lot.balance, note: req.body.note || 'Marked as cleared' }, req.user._id));
});

exports.deactivate = asyncHandler(async (req, res) => {
  const lot = await findLot(req.params.id);
  if (lot.isActive === false) throw new ApiError(409, 'Lot is already cancelled');
  if (lot.totalPaid > 0) throw new ApiError(409, 'A lot with recorded payments cannot be cancelled');
  if (lot.received) await stock.reverseLot(lot, req.user._id);
  await lot.deactivate(req.user._id);
  ok(res, lot);
});
