const simpleCrud = require('./simpleCrud');
const Vendor = require('../models/Vendor');
const Lot = require('../models/Lot');
const FuelEntry = require('../models/FuelEntry');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok, assertId } = require('../utils/http');
const { round2 } = require('../utils/money');

const crud = simpleCrud(Vendor, {
  label: 'vendor',
  fields: ['name', 'contactPerson', 'email', 'phone', 'address', 'gstin', 'notes'],
  searchFields: ['name', 'contactPerson', 'email', 'phone'],
});

// What we have bought from this vendor and what is still owed.
crud.summary = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(assertId(req.params.id));
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  const [lots, fuel] = await Promise.all([
    Lot.find({ vendor: vendor._id, isActive: { $ne: false } }).sort({ purchaseDate: -1 }).lean(),
    FuelEntry.find({ vendor: vendor._id, isActive: { $ne: false } }).select('total').lean(),
  ]);
  const purchased = lots.reduce((s, l) => s + l.totalPayable, 0);
  const paid = lots.reduce((s, l) => s + l.totalPaid, 0);
  ok(res, {
    vendor,
    lotCount: lots.length,
    totalPurchased: round2(purchased),
    totalPaid: round2(paid),
    outstanding: round2(purchased - paid),
    fuelTotal: round2(fuel.reduce((s, f) => s + f.total, 0)),
    recentLots: lots.slice(0, 10),
  });
});

module.exports = crud;
