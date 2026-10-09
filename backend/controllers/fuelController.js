const FuelEntry = require('../models/FuelEntry');
const Vendor = require('../models/Vendor');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { discardUpload } = require('../middleware/upload');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paging, pageMeta, assertId, pick, dateRange, activeFilter } = require('../utils/http');
const { round2 } = require('../utils/money');
const { castIds, sumField } = require('../utils/aggregate');

const POPULATE = [{ path: 'vendor', select: 'name' }, { path: 'vehicle', select: 'name number' }, { path: 'fueledBy', select: 'name' }];

function buildFilter(query) {
  const filter = { ...activeFilter(query), ...dateRange(query, 'date') };
  if (query.vehicle) filter.vehicle = assertId(query.vehicle, 'vehicle');
  if (query.vendor) filter.vendor = assertId(query.vendor, 'vendor');
  return filter;
}

exports.list = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  if (req.user.role !== 'admin') filter.fueledBy = req.user._id;
  const p = paging(req.query);
  const match = castIds(filter, ['vehicle', 'vendor', 'fueledBy']);
  const [rows, total, totalLitres, totalAmount] = await Promise.all([
    FuelEntry.find(filter).populate(POPULATE).sort({ date: -1 }).skip(p.skip).limit(p.limit),
    FuelEntry.countDocuments(filter),
    sumField(FuelEntry, match, 'litres'),
    sumField(FuelEntry, match, 'total'),
  ]);
  ok(res, rows, { ...pageMeta(p, total), totalLitres: round2(totalLitres), totalAmount: round2(totalAmount) });
});

exports.create = asyncHandler(async (req, res) => {
  try {
    const b = req.body;
    const [vendor, vehicle] = await Promise.all([Vendor.findById(assertId(b.vendor, 'fuel station')), Vehicle.findById(assertId(b.vehicle, 'vehicle'))]);
    if (!vendor || vendor.isActive === false) throw new ApiError(400, 'Fuel station not found');
    if (!vehicle || vehicle.isActive === false) throw new ApiError(400, 'Vehicle not found');

    let fueledBy = req.user._id;
    if (req.user.role === 'admin' && b.fueledBy) {
      const u = await User.findById(assertId(b.fueledBy, 'user'));
      if (!u) throw new ApiError(400, 'User not found');
      fueledBy = u._id;
    }
    const litres = Number(b.litres);
    const costPerLitre = Number(b.costPerLitre);
    if (!(litres > 0) || !(costPerLitre >= 0)) throw new ApiError(400, 'Litres and rate must be valid numbers');

    const entry = await FuelEntry.create({
      ...pick(b, ['date', 'invoiceNumber']),
      vendor: vendor._id, vehicle: vehicle._id, fueledBy, litres, costPerLitre,
      total: round2(litres * costPerLitre), // the backend decides the total
      invoiceFile: req.file?.filename,
    });
    await entry.populate(POPULATE);
    ok(res, entry, null, 201);
  } catch (err) {
    discardUpload(req.file);
    throw err;
  }
});

exports.update = asyncHandler(async (req, res) => {
  const entry = await FuelEntry.findById(assertId(req.params.id));
  if (!entry) throw new ApiError(404, 'Fuel entry not found');
  entry.set(pick(req.body, ['date', 'litres', 'costPerLitre', 'invoiceNumber']));
  entry.total = round2(entry.litres * entry.costPerLitre);
  await entry.save();
  await entry.populate(POPULATE);
  ok(res, entry);
});

exports.deactivate = asyncHandler(async (req, res) => {
  const entry = await FuelEntry.findById(assertId(req.params.id));
  if (!entry) throw new ApiError(404, 'Fuel entry not found');
  await entry.deactivate(req.user._id);
  ok(res, entry);
});
