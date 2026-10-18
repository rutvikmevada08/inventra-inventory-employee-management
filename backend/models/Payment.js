const mongoose = require('mongoose');
const { round2 } = require('../utils/money');

const paymentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    payroll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
      required: [true, 'Payroll is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
      set: (val) => round2(val),
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'Cash', 'UPI', 'Cheque', 'Other'],
      default: 'Bank Transfer',
    },
    transactionReference: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Completed', 'Voided'],
      default: 'Completed',
    },
    voidReason: {
      type: String,
      trim: true,
    },
    voidedAt: {
      type: Date,
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

paymentSchema.index({ employee: 1, paymentDate: -1 });
paymentSchema.index({ payroll: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
