const Reimbursement = require('../models/Reimbursement');
const User = require('../models/User');
const { notify } = require('../services/mail');
const env = require('../config/env');
const { discardUpload } = require('../middleware/upload');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paging, pageMeta, escapeRegex, assertId, pick, dateRange, activeFilter } = require('../utils/http');
const { round2 } = require('../utils/money');
const { castIds, sumByGroup } = require('../utils/aggregate');

const POPULATE = [{ path: 'claimant', select: 'name email' }, { path: 'decidedBy', select: 'name' }];
const EDITABLE = ['date', 'amount', 'spentOn', 'vendorName', 'invoiceNumber', 'paidBy'];

function scopedFilter(req) {
  const filter = { ...activeFilter(req.query), ...dateRange(req.query, 'date') };
  if (req.user.role !== 'admin') filter.claimant = req.user._id;
  else if (req.query.claimant) filter.claimant = assertId(req.query.claimant, 'user');
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ spentOn: rx }, { vendorName: rx }, { invoiceNumber: rx }];
  }
  return filter;
}

exports.list = asyncHandler(async (req, res) => {
  const filter = scopedFilter(req);
  const p = paging(req.query);
  const [rows, total] = await Promise.all([
    Reimbursement.find(filter).populate(POPULATE).sort({ date: -1 }).skip(p.skip).limit(p.limit),
    Reimbursement.countDocuments(filter),
  ]);
  ok(res, rows, pageMeta(p, total));
});

// Totals per status for whatever the current filters select.
exports.summary = asyncHandler(async (req, res) => {
  const match = castIds(scopedFilter(req), ['claimant']);
  const [amounts, counts] = await Promise.all([sumByGroup(Reimbursement, match, 'status', 'amount'), sumByGroup(Reimbursement, match, 'status', 1)]);
  const out = {};
  ['requested', 'approved', 'paid', 'rejected'].forEach((s) => { out[s] = { amount: round2(amounts.get(s) || 0), count: counts.get(s) || 0 }; });
  ok(res, out);
});

exports.get = asyncHandler(async (req, res) => {
  const doc = await Reimbursement.findById(assertId(req.params.id)).populate(POPULATE);
  if (!doc || (req.user.role !== 'admin' && String(doc.claimant._id) !== String(req.user._id))) throw new ApiError(404, 'Reimbursement not found');
  ok(res, doc);
});

exports.create = asyncHandler(async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let claimant = req.user._id;
    if (isAdmin && req.body.claimant) {
      const u = await User.findById(assertId(req.body.claimant, 'claimant'));
      if (!u || u.isActive === false) throw new ApiError(400, 'Claimant not found');
      claimant = u._id;
    }
    // Staff always file a request. An admin may record one that is already approved.
    const status = isAdmin && req.body.status === 'approved' ? 'approved' : 'requested';
    const doc = await Reimbursement.create({
      ...pick(req.body, EDITABLE), claimant, status, createdBy: req.user._id, invoiceFile: req.file?.filename,
      ...(status === 'approved' && { decidedBy: req.user._id, decidedAt: new Date() }),
    });
    if (status === 'requested') {
      notify({ to: env.notifyEmails, subject: 'New reimbursement request', text: `${req.user.name} has requested reimbursement of INR ${doc.amount} for ${doc.spentOn}.` });
    }
    await doc.populate(POPULATE);
    ok(res, doc, null, 201);
  } catch (err) {
    discardUpload(req.file);
    throw err;
  }
});

exports.update = asyncHandler(async (req, res) => {
  const doc = await Reimbursement.findById(assertId(req.params.id));
  if (!doc) throw new ApiError(404, 'Reimbursement not found');
  if (doc.status === 'paid') throw new ApiError(409, 'A paid reimbursement cannot be edited');
  doc.set(pick(req.body, EDITABLE));
  await doc.save();
  ok(res, doc);
});

// Each transition is a conditional update, so a stale click cannot move a record twice.
async function transition(req, res, from, set, message) {
  const id = assertId(req.params.id);
  const doc = await Reimbursement.findOneAndUpdate({ _id: id, status: from, isActive: { $ne: false } }, set, { new: true, runValidators: true }).populate(POPULATE);
  if (!doc) {
    const current = await Reimbursement.findById(id).lean();
    if (!current) throw new ApiError(404, 'Reimbursement not found');
    throw new ApiError(409, `${message} (current status: ${current.status})`);
  }
  return doc;
}

exports.approve = asyncHandler(async (req, res) => {
  const doc = await transition(req, res, 'requested', { status: 'approved', decidedBy: req.user._id, decidedAt: new Date(), ...(req.body.paidBy && { paidBy: req.body.paidBy }) }, 'Only requested items can be approved');
  notify({ to: doc.claimant?.email, subject: 'Reimbursement approved', text: `Your reimbursement request for INR ${doc.amount} has been approved.` });
  ok(res, doc);
});

exports.reject = asyncHandler(async (req, res) => {
  const doc = await transition(req, res, 'requested', { status: 'rejected', decidedBy: req.user._id, decidedAt: new Date(), rejectionReason: req.body.reason }, 'Only requested items can be rejected');
  notify({ to: doc.claimant?.email, subject: 'Reimbursement rejected', text: `Your reimbursement request for INR ${doc.amount} was rejected.${doc.rejectionReason ? `\n\nReason: ${doc.rejectionReason}` : ''}` });
  ok(res, doc);
});

// Replaces the old "mark as reimbursed".
exports.pay = asyncHandler(async (req, res) => {
  const doc = await transition(req, res, 'approved', { status: 'paid', paidAt: req.body.paidAt || new Date(), paymentMethod: req.body.paymentMethod, paymentReference: req.body.paymentReference }, 'Only approved items can be marked as paid');
  ok(res, doc);
});

exports.deactivate = asyncHandler(async (req, res) => {
  const doc = await Reimbursement.findById(assertId(req.params.id));
  if (!doc) throw new ApiError(404, 'Reimbursement not found');
  if (doc.status === 'paid') throw new ApiError(409, 'Paid reimbursements are kept for the record and cannot be removed');
  await doc.deactivate(req.user._id);
  ok(res, doc);
});
