const mongoose = require('mongoose');

const itemRequestSchema = new mongoose.Schema(
  {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemType: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemType', required: true },
    quantity: { type: Number, required: true, min: [0.001, 'Quantity must be greater than zero'] },
    reason: { type: String, required: [true, 'Reason is required'], trim: true },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['requested', 'approved', 'rejected'], default: 'requested', index: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
    rejectionReason: { type: String, trim: true },
    // false for requests approved before the stock ledger existed, or for service types.
    stockIssued: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ItemRequest', itemRequestSchema);
