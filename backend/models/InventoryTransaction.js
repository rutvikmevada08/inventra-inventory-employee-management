const mongoose = require('mongoose');

// Append-only stock ledger. Stock on hand = sum(in) - sum(out) for an item type.
// A mistake is corrected with a reversal or adjustment entry, never an edit.
const schema = new mongoose.Schema(
  {
    itemType: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemType', required: true, index: true },
    type: { type: String, enum: ['in', 'out'], required: true },
    quantity: { type: Number, required: true, min: [0.001, 'Quantity must be greater than zero'] },
    date: { type: Date, default: Date.now, index: true },
    source: {
      type: String,
      enum: ['lot', 'lot_reversal', 'item_request', 'adjustment', 'opening_balance'],
      required: true,
    },
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot' },
    // Unique + sparse: a lot line can be received once, a request can be issued once.
    lotItem: { type: mongoose.Schema.Types.ObjectId, ref: 'LotItem', unique: true, sparse: true },
    itemRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemRequest', unique: true, sparse: true },
    // Points at the entry this one cancels. One reversal per original entry.
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryTransaction', unique: true, sparse: true },
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const blocked = function blocked(next) {
  next(new Error('Inventory transactions are append-only and cannot be changed or deleted'));
};
['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'replaceOne']
  .forEach((op) => schema.pre(op, blocked));
schema.pre('save', function onlyNew(next) {
  if (!this.isNew) return next(new Error('Inventory transactions are append-only and cannot be changed'));
  next();
});

module.exports = mongoose.model('InventoryTransaction', schema);
