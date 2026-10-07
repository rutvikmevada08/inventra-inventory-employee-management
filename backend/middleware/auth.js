const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

// Token comes only from the Authorization header. No cookies are used anywhere.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'Session expired or invalid. Please sign in again.');
  }

  // Look the user up every time so deactivation and role changes apply immediately.
  const user = await User.findById(payload.sub);
  if (!user || user.isActive === false) throw new ApiError(401, 'Account is not active');
  req.user = user;
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(new ApiError(403, 'You do not have permission to do this'));
  next();
};

const adminOnly = requireRole('admin');

module.exports = { signToken, authenticate, requireRole, adminOnly };
