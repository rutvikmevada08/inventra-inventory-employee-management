const mongoose = require('mongoose');
const ApiError = require('./ApiError');

const ok = (res, data, meta, status = 200) => res.status(status).json({ success: true, data, ...(meta && { meta }) });

function paging(query, defaultLimit = 20) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
}

const pageMeta = (p, total) => ({ page: p.page, limit: p.limit, total, pages: Math.max(Math.ceil(total / p.limit), 1) });

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function assertId(id, label = 'id') {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label}`);
  return id;
}

// Copy only whitelisted keys so clients cannot set fields like role or isActive.
const pick = (obj, keys) => keys.reduce((out, k) => (obj[k] !== undefined ? { ...out, [k]: obj[k] } : out), {});

function dateRange(query, field = 'date') {
  const range = {};
  if (query.from) {
    const d = new Date(query.from);
    if (isNaN(d)) throw new ApiError(400, 'Invalid from date');
    range.$gte = d;
  }
  if (query.to) {
    const d = new Date(query.to);
    if (isNaN(d)) throw new ApiError(400, 'Invalid to date');
    d.setHours(23, 59, 59, 999);
    range.$lte = d;
  }
  return Object.keys(range).length ? { [field]: range } : {};
}

// ?status=inactive|all switches the soft-delete filter; default is active only.
function activeFilter(query) {
  if (query.status === 'all') return {};
  if (query.status === 'inactive') return { isActive: false };
  return { isActive: { $ne: false } };
}

module.exports = { ok, paging, pageMeta, escapeRegex, assertId, pick, dateRange, activeFilter };
