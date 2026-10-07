const mongoose = require('mongoose');

// One line of a purchase lot. totalPayable is always quantity x costPerUnit,
// calculated by the controller rather than trusted from the client.
const lotItemSchema = new mongoose.Schema(
  {
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true, index: true },
    itemType: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemType', required: true },
    quantity: { type: Number, required: true, min: [0.001, 'Quantity must be greater than zero'] },
    costPerUnit: { type: Number, required: true, min: [0, 'Cost cannot be negative'] },
    totalPayable: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LotItem', lotItemSchema);
