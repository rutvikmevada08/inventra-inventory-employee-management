const mongoose = require('mongoose');
const softDelete = require('./plugins/softDelete');
const { round2 } = require('../utils/money');

// Payments against a lot are only ever appended. totalPaid is the running sum.
const lotPaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: [0.01, 'Payment must be greater than zero'] },
    date: { type: Date, default: Date.now },
    method: { type: String, trim: true },
    reference: { type: String, trim: true },
    note: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const lotSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: [true, 'Vendor is required'] },
    purchaseDate: { type: Date, required: [true, 'Purchase date is required'] },
    invoiceNumber: { type: String, required: [true, 'Invoice number is required'], trim: true },
    lotType: { type: String, trim: true },
    paidBy: { type: String, trim: true },
    description: { type: String, trim: true },
    totalPayable: { type: Number, required: true, min: [0, 'Total payable cannot be negative'] },
    totalPaid: { type: Number, default: 0, min: [0, 'Total paid cannot be negative'] },
    // Stored (not computed) so lists can filter on it.
    paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid', index: true },
    payments: [lotPaymentSchema],
    received: { type: Boolean, default: false },
    receivedAt: Date,
    invoiceFile: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);
lotSchema.plugin(softDelete);
lotSchema.index({ purchaseDate: -1 });
lotSchema.index({ vendor: 1, invoiceNumber: 1 });

lotSchema.virtual('balance').get(function balance() {
  return round2(this.totalPayable - this.totalPaid);
});
lotSchema.virtual('Vendor').get(function () { return this.vendor; });
lotSchema.virtual('Purchase_date').get(function () { return this.purchaseDate; });
lotSchema.virtual('Invoice_number').get(function () { return this.invoiceNumber; });
lotSchema.virtual('Total_payable').get(function () { return this.totalPayable; });
lotSchema.virtual('Total_paid').get(function () { return this.totalPaid; });
lotSchema.virtual('Received').get(function () { return this.received; });
lotSchema.virtual('Invoice').get(function () { return this.invoiceFile; });
lotSchema.virtual('Lot_type').get(function () { return this.lotType; });
lotSchema.virtual('Paid_by').get(function () { return this.paidBy; });
lotSchema.virtual('Description').get(function () { return this.description; });
lotSchema.pre('validate', function checkPaid(next) {
  if (this.totalPaid > this.totalPayable + 0.005) {
    this.invalidate('totalPaid', 'Total paid cannot exceed total payable');
  }
  if (this.totalPaid <= 0) this.paymentStatus = 'unpaid';
  else this.paymentStatus = this.totalPaid >= this.totalPayable - 0.005 ? 'paid' : 'partial';
  next();
});

module.exports = mongoose.model('Lot', lotSchema);
