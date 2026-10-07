const mongoose = require('mongoose');
const softDelete = require('./plugins/softDelete');

// The old "item types" mixed physical goods with services (rent, audit fee,
// software renewals). Only stockable types take part in the stock ledger.
const itemTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    unit: { type: String, trim: true, default: 'pcs' },
    reorderLevel: { type: Number, default: 0, min: [0, 'Reorder level cannot be negative'] },
    isStockable: { type: Boolean, default: true },
  },
  { timestamps: true }
);
itemTypeSchema.plugin(softDelete);
itemTypeSchema.index({ name: 1 });

module.exports = mongoose.model('ItemType', itemTypeSchema);
