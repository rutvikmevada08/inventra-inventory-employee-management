const mongoose = require('mongoose');
const softDelete = require('./plugins/softDelete');

const fuelEntrySchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: [true, 'Fuel station is required'] },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: [true, 'Vehicle is required'], index: true },
    date: { type: Date, required: [true, 'Date is required'], index: true },
    litres: { type: Number, required: true, min: [0.01, 'Litres must be greater than zero'] },
    costPerLitre: { type: Number, required: true, min: [0, 'Rate cannot be negative'] },
    total: { type: Number, required: true, min: 0 },
    fueledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceNumber: { type: String, trim: true },
    invoiceFile: String,
  },
  { timestamps: true }
);
fuelEntrySchema.plugin(softDelete);

module.exports = mongoose.model('FuelEntry', fuelEntrySchema);
