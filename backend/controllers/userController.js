const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paging, pageMeta, escapeRegex, assertId, pick, activeFilter } = require('../utils/http');

const FIELDS = ['name', 'email', 'phone', 'role'];

const activeAdminCount = () => User.countDocuments({ role: 'admin', isActive: { $ne: false } });

exports.list = asyncHandler(async (req, res) => {
  const filter = activeFilter(req.query);
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const p = paging(req.query);
  const [rows, total] = await Promise.all([
    User.find(filter).sort({ name: 1 }).skip(p.skip).limit(p.limit),
    User.countDocuments(filter),
  ]);
  ok(res, rows, pageMeta(p, total));
});

exports.create = asyncHandler(async (req, res) => {
  const user = new User(pick(req.body, FIELDS));
  if (req.body.password) await user.setPassword(req.body.password);
  await user.save();
  ok(res, user, null, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const user = await User.findById(assertId(req.params.id));
  if (!user) throw new ApiError(404, 'User not found');
  const changes = pick(req.body, FIELDS);
  if (changes.role && changes.role !== 'admin' && user.role === 'admin' && (await activeAdminCount()) <= 1) {
    throw new ApiError(409, 'There must be at least one active admin');
  }
  user.set(changes);
  await user.save();
  ok(res, user);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(assertId(req.params.id));
  if (!user) throw new ApiError(404, 'User not found');
  await user.setPassword(req.body.password);
  await user.save();
  ok(res, { message: 'Password reset' });
});

exports.deactivate = asyncHandler(async (req, res) => {
  const user = await User.findById(assertId(req.params.id));
  if (!user) throw new ApiError(404, 'User not found');
  if (user.id === req.user.id) throw new ApiError(409, 'You cannot deactivate your own account');
  if (user.role === 'admin' && (await activeAdminCount()) <= 1) throw new ApiError(409, 'There must be at least one active admin');
  await user.deactivate(req.user._id);
  ok(res, user);
});

exports.reactivate = asyncHandler(async (req, res) => {
  const user = await User.findById(assertId(req.params.id));
  if (!user) throw new ApiError(404, 'User not found');
  await user.reactivate();
  ok(res, user);
});
