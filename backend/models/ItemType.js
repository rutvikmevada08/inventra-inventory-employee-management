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

itemTypeSchema.virtual('Type_name').get(function () {
  return this.name;
}).set(function (v) {
  this.name = v;
});

itemTypeSchema.set('toJSON', { virtuals: true });
itemTypeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ItemType', itemTypeSchema);
