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
    stockIssued: { type: Boolean, default: false },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issuedAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

itemRequestSchema.virtual('Employee').get(function () { return this.employee || this.requestedBy; });
itemRequestSchema.virtual('item').get(function () { return this.itemType; });
itemRequestSchema.virtual('Quantity').get(function () { return this.quantity; });
itemRequestSchema.virtual('Date').get(function () { return this.date; });
itemRequestSchema.virtual('Status').get(function () {
  if (this.stockIssued) return 'Issued';
  if (this.status) {
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }
  return this.status;
});
itemRequestSchema.virtual('approvedBy').get(function () { return this.decidedBy; });
itemRequestSchema.virtual('approvedAt').get(function () { return this.decidedAt; });

module.exports = mongoose.model('ItemRequest', itemRequestSchema);
