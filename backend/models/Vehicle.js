const mongoose = require('mongoose');
const softDelete = require('./plugins/softDelete');

const vehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Vehicle name is required'], trim: true },
    number: { type: String, required: [true, 'Registration number is required'], trim: true, uppercase: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);
vehicleSchema.plugin(softDelete);

module.exports = mongoose.model('Vehicle', vehicleSchema);
