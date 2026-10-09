const mongoose = require('mongoose');
const softDelete = require('./plugins/softDelete');

// Replaces the old pair of collections (reimbursement_req + reimbursement).
// One record moves requested -> approved -> paid, so nothing is deleted on approval or rejection.
const reimbursementSchema = new mongoose.Schema(
  {
    claimant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: [true, 'Date is required'] },
    amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than zero'] },
    spentOn: { type: String, required: [true, 'Description of the expense is required'], trim: true },
    vendorName: { type: String, trim: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    invoiceNumber: { type: String, trim: true },
    invoiceFile: String,
    status: { type: String, enum: ['requested', 'approved', 'paid', 'rejected'], default: 'requested', index: true },
    paidBy: { type: String, trim: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
    rejectionReason: { type: String, trim: true },
    paidAt: Date,
    paymentMethod: { type: String, trim: true },
    paymentReference: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
reimbursementSchema.plugin(softDelete);
reimbursementSchema.index({ date: -1 });

module.exports = mongoose.model('Reimbursement', reimbursementSchema);
