const mongoose = require('mongoose');

// Aggregations here use one $sum per $group on purpose: plain, portable pipelines
// that behave the same on MongoDB and MongoDB-compatible servers.
const toId = (v) => new mongoose.Types.ObjectId(String(v));

// Aggregation does not cast values the way find() does, so ids must be converted by hand.
function castIds(match, keys) {
  const out = { ...match };
  keys.forEach((k) => { if (out[k]) out[k] = toId(out[k]); });
  return out;
}

async function sumField(Model, match, field) {
  const rows = await Model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: `$${field}` } } }]);
  return rows[0]?.total || 0;
}

// Map(groupKey -> sum). Pass field = 1 to count documents instead.
async function sumByGroup(Model, match, groupBy, field) {
  const rows = await Model.aggregate([{ $match: match }, { $group: { _id: `$${groupBy}`, total: { $sum: field === 1 ? 1 : `$${field}` } } }]);
  return new Map(rows.map((r) => [String(r._id), r.total]));
}

module.exports = { toId, castIds, sumField, sumByGroup };
