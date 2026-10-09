const mongoose = require('mongoose');
const softDelete = require('./plugins/softDelete');

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Vendor name is required'], trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Email address is not valid'] },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    gstin: { type: String, uppercase: true, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);
vendorSchema.plugin(softDelete);
vendorSchema.index({ name: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
