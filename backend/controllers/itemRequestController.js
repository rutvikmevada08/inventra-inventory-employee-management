const ItemRequest = require('../models/ItemRequest');
const ItemType = require('../models/ItemType');
const stock = require('../services/stock');
const { notify } = require('../services/mail');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paging, pageMeta, assertId, dateRange } = require('../utils/http');
const { round3 } = require('../utils/money');

const POPULATE = [{ path: 'requestedBy', select: 'name email' }, { path: 'itemType', select: 'name unit isStockable' }, { path: 'decidedBy', select: 'name' }];

exports.list = asyncHandler(async (req, res) => {
  const filter = { ...dateRange(req.query, 'date') };
  if (req.user.role !== 'admin') filter.requestedBy = req.user._id; // staff only ever see their own
  else if (req.query.requestedBy) filter.requestedBy = assertId(req.query.requestedBy, 'user');
  if (req.query.status) filter.status = req.query.status;
  if (req.query.itemType) filter.itemType = assertId(req.query.itemType, 'item type');
  const p = paging(req.query);
  const [rows, total] = await Promise.all([
    ItemRequest.find(filter).populate(POPULATE).sort({ date: -1 }).skip(p.skip).limit(p.limit),
    ItemRequest.countDocuments(filter),
  ]);
  ok(res, rows, pageMeta(p, total));
});

exports.create = asyncHandler(async (req, res) => {
  const type = await ItemType.findById(assertId(req.body.itemType, 'item type'));
  if (!type || type.isActive === false) throw new ApiError(400, 'Item type not found');
  const request = await ItemRequest.create({
    requestedBy: req.user._id,
    itemType: type._id,
    quantity: round3(req.body.quantity),
    reason: req.body.reason,
  });
  notify({
    to: env.notifyEmails,
    subject: 'New item request',
    text: `${req.user.name} has requested ${request.quantity} ${type.unit || ''} of ${type.name}.\n\nReason: ${request.reason}`,
  });
  await request.populate(POPULATE);
  ok(res, request, null, 201);
});

// Approval issues the stock. The status change is claimed first with a conditional
// update so two admins cannot approve (and issue stock for) the same request twice.
exports.approve = asyncHandler(async (req, res) => {
  const id = assertId(req.params.id);
  const request = await ItemRequest.findById(id).populate('itemType').populate('requestedBy', 'name email');
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
        itemRequest: request._id, note: `Issued to ${request.requestedBy?.name || 'staff'}`, createdBy: req.user._id,
      });
    } catch (err) {
      await ItemRequest.updateOne({ _id: id }, { status: 'requested', $unset: { decidedBy: 1, decidedAt: 1 }, stockIssued: false });
      throw err;
    }
  }

  notify({
    to: request.requestedBy?.email,
    subject: 'Item request approved',
    text: `Your request for ${request.quantity} ${request.itemType?.name} has been approved.`,
  });
  await claimed.populate(POPULATE);
  ok(res, claimed);
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
    to: updated.requestedBy?.email,
    subject: 'Item request rejected',
    text: `Your request for ${updated.quantity} ${updated.itemType?.name} was rejected.${updated.rejectionReason ? `\n\nReason: ${updated.rejectionReason}` : ''}`,
  });
  ok(res, updated);
});
