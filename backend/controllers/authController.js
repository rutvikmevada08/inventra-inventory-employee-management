const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/http');

// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

exports.login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = user ? await user.checkPassword(password) : await bcrypt.compare(password, DUMMY_HASH).then(() => false);
  if (!user || !valid || user.isActive === false || !user.loginEnabled) {
    throw new ApiError(401, 'Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();
  ok(res, { token: signToken(user), user });
});

exports.me = (req, res) => ok(res, req.user);

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!(await user.checkPassword(String(currentPassword || '')))) throw new ApiError(400, 'Current password is incorrect');
  await user.setPassword(newPassword);
  await user.save();
  ok(res, { message: 'Password updated' });
});
