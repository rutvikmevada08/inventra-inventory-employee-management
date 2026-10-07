const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paging, pageMeta, escapeRegex, assertId, pick, activeFilter } = require('../utils/http');

// Vendors, item types and vehicles are plain lists with the same shape of endpoints,
// so they share this factory. Anything with real business rules has its own controller.
module.exports = function simpleCrud(Model, { label, fields, searchFields = ['name'], uniqueField = 'name', sort = { name: 1 } }) {
  async function assertUnique(value, exceptId) {
    if (!value) return;
    const dup = await Model.findOne({
      [uniqueField]: new RegExp(`^${escapeRegex(value)}$`, 'i'),
      isActive: { $ne: false },
      ...(exceptId && { _id: { $ne: exceptId } }),
    }).lean();
    if (dup) throw new ApiError(409, `A ${label} with this ${uniqueField} already exists`);
  }

  const find = async (id) => {
    const doc = await Model.findById(assertId(id));
    if (!doc) throw new ApiError(404, `${label[0].toUpperCase()}${label.slice(1)} not found`);
    return doc;
  };

  return {
    list: asyncHandler(async (req, res) => {
      const filter = activeFilter(req.query);
      if (req.query.q) {
        const rx = new RegExp(escapeRegex(req.query.q), 'i');
        filter.$or = searchFields.map((f) => ({ [f]: rx }));
      }
      const p = paging(req.query, 50);
      const [rows, total] = await Promise.all([
        Model.find(filter).sort(sort).skip(p.skip).limit(p.limit),
        Model.countDocuments(filter),
      ]);
      ok(res, rows, pageMeta(p, total));
    }),

    get: asyncHandler(async (req, res) => ok(res, await find(req.params.id))),

    create: asyncHandler(async (req, res) => {
      const data = pick(req.body, fields);
      await assertUnique(data[uniqueField]);
      ok(res, await Model.create(data), null, 201);
    }),

    update: asyncHandler(async (req, res) => {
      const doc = await find(req.params.id);
      const data = pick(req.body, fields);
      if (data[uniqueField]) await assertUnique(data[uniqueField], doc._id);
      doc.set(data);
      ok(res, await doc.save());
    }),

    deactivate: asyncHandler(async (req, res) => {
      const doc = await find(req.params.id);
      ok(res, await doc.deactivate(req.user._id));
    }),

    reactivate: asyncHandler(async (req, res) => {
      const doc = await find(req.params.id);
      ok(res, await doc.reactivate());
    }),
  };
};
