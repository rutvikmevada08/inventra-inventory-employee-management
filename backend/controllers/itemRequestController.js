const ItemRequest = require('../models/ItemRequest');
const ItemType = require('../models/ItemType');
const stock = require('../services/stock');
const { notify } = require('../services/mail');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paging, pageMeta, assertId, dateRange } = require('../utils/http');
const { round3 } = require('../utils/money');

const POPULATE = [
  { path: 'requestedBy', select: 'name email' },
  { path: 'employee', select: 'name employeeId department email' },
  { path: 'itemType', select: 'name unit isStockable Type_name' },
  { path: 'decidedBy', select: 'name' },
  { path: 'issuedBy', select: 'name email' },
];

exports.list = asyncHandler(async (req, res) => {
  const filter = { ...dateRange(req.query, 'date') };
  if (req.user.role !== 'admin') {
    filter.$or = [{ requestedBy: req.user._id }];
    if (req.query.employeeId) filter.$or.push({ employee: assertId(req.query.employeeId, 'employee') });
  } else {
    if (req.query.requestedBy) filter.requestedBy = assertId(req.query.requestedBy, 'user');
    if (req.query.employeeId) filter.employee = assertId(req.query.employeeId, 'employee');
  }
  if (req.query.status) {
    const s = String(req.query.status).toLowerCase();
    if (s === 'issued') {
      filter.stockIssued = true;
    } else {
      filter.status = s;
    }
  }
  if (req.query.itemType || req.query.itemTypeId) {
    filter.itemType = assertId(req.query.itemType || req.query.itemTypeId, 'item type');
  }
  const p = paging(req.query);
  const [rows, total] = await Promise.all([
    ItemRequest.find(filter).populate(POPULATE).sort({ date: -1, createdAt: -1 }).skip(p.skip).limit(p.limit),
    ItemRequest.countDocuments(filter),
  ]);
  ok(res, rows, pageMeta(p, total), 200, { requests: rows });
});

exports.create = asyncHandler(async (req, res) => {
  const typeId = req.body.itemType || req.body.itemTypeId;
  const type = await ItemType.findById(assertId(typeId, 'item type'));
  if (!type || type.isActive === false) throw new ApiError(400, 'Item type not found');

  const qty = round3(req.body.quantity);
  if (isNaN(qty) || qty <= 0) throw new ApiError(400, 'Quantity must be greater than zero');
  if (!req.body.reason || !String(req.body.reason).trim()) throw new ApiError(400, 'Reason is required');

  const request = await ItemRequest.create({
    requestedBy: req.user._id,
    employee: req.body.employeeId ? assertId(req.body.employeeId, 'employee') : undefined,
    itemType: type._id,
    quantity: qty,
    reason: String(req.body.reason).trim(),
    date: req.body.date ? new Date(req.body.date) : new Date(),
  });
  notify({
    to: env.notifyEmails,
    subject: 'New item request',
    text: `${req.user.name} has requested ${request.quantity} ${type.unit || ''} of ${type.name}.\n\nReason: ${request.reason}`,
  });
  await request.populate(POPULATE);
  ok(res, request, null, 201, { message: 'Item request submitted successfully.', request });
});

// Approval issues the stock. The status change is claimed first with a conditional
// update so two admins cannot approve (and issue stock for) the same request twice.
exports.approve = asyncHandler(async (req, res) => {
  const id = assertId(req.params.id);
  const request = await ItemRequest.findById(id).populate('itemType').populate('requestedBy', 'name email').populate('employee');
  if (!request) throw new ApiError(404, 'Request not found');
  if (request.status !== 'requested') throw new ApiError(409, `This request has already been ${request.status}`);

  const trackStock = Boolean(request.itemType?.isStockable);
  if (trackStock) {
    const available = await stock.balanceOf(request.itemType._id);
    if (request.quantity > available + 1e-9) {
      throw new ApiError(409, `Insufficient stock. Available: ${available}, requested: ${request.quantity}`, { available });
    }
  }

  const claimed = await ItemRequest.findOneAndUpdate(
    { _id: id, status: 'requested' },
    { status: 'approved', decidedBy: req.user._id, decidedAt: new Date(), stockIssued: trackStock },
    { new: true }
  );
  if (!claimed) throw new ApiError(409, 'This request has just been processed by someone else');

  if (trackStock) {
    try {
      await stock.record({
        itemType: request.itemType._id, type: 'out', quantity: request.quantity, source: 'item_request',
        itemRequest: request._id, note: `Issued to ${request.employee?.name || request.requestedBy?.name || 'staff'}`, createdBy: req.user._id,
      });
    } catch (err) {
      await ItemRequest.updateOne({ _id: id }, { status: 'requested', $unset: { decidedBy: 1, decidedAt: 1 }, stockIssued: false });
      throw err;
    }
  }

  notify({
    to: request.requestedBy?.email || request.employee?.email,
    subject: 'Item request approved',
    text: `Your request for ${request.quantity} ${request.itemType?.name} has been approved.`,
  });
  await claimed.populate(POPULATE);
  ok(res, claimed, null, 200, { message: 'Item request approved.', request: claimed });
});

// Issue stock (creates Stock-Out in ledger if not already issued)
exports.issue = asyncHandler(async (req, res) => {
  const id = assertId(req.params.id);
  const request = await ItemRequest.findById(id).populate('itemType').populate('requestedBy', 'name email').populate('employee');
  if (!request) throw new ApiError(404, 'Item request not found');

  if (request.stockIssued) {
    throw new ApiError(400, 'Duplicate action rejected: this item request has already been issued.');
  }

  const trackStock = Boolean(request.itemType?.isStockable);
  if (trackStock) {
    const available = await stock.balanceOf(request.itemType._id);
    if (request.quantity > available + 1e-9) {
      throw new ApiError(400, `Insufficient stock: Requested quantity is ${request.quantity}, but current available stock is ${available}.`, { available });
    }
    await stock.record({
      itemType: request.itemType._id,
      type: 'out',
      quantity: request.quantity,
      source: 'item_request',
      itemRequest: request._id,
      note: `Issued to ${request.employee?.name || request.requestedBy?.name || 'staff'} for: ${request.reason}`,
      createdBy: req.user._id,
    });
  }

  request.status = 'approved';
  request.stockIssued = true;
  request.issuedBy = req.user._id;
  request.issuedAt = new Date();
  if (!request.decidedBy) {
    request.decidedBy = req.user._id;
    request.decidedAt = new Date();
  }
  await request.save();
  await request.populate(POPULATE);

  ok(res, request, null, 200, { message: 'Stock issued successfully and recorded in inventory ledger.', request });
});

exports.reject = asyncHandler(async (req, res) => {
  const id = assertId(req.params.id);
  const updated = await ItemRequest.findOneAndUpdate(
    { _id: id, status: 'requested' },
    { status: 'rejected', decidedBy: req.user._id, decidedAt: new Date(), rejectionReason: req.body.reason },
    { new: true }
  ).populate(POPULATE);
  if (!updated) {
    const exists = await ItemRequest.exists({ _id: id });
    throw new ApiError(exists ? 409 : 404, exists ? 'This request has already been processed' : 'Request not found');
  }
  notify({
    to: updated.requestedBy?.email || updated.employee?.email,
    subject: 'Item request rejected',
    text: `Your request for ${updated.quantity} ${updated.itemType?.name} was rejected.${updated.rejectionReason ? `\n\nReason: ${updated.rejectionReason}` : ''}`,
  });
  ok(res, updated, null, 200, { message: 'Item request rejected.', request: updated });
});
