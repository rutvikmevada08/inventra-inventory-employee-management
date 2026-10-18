const mongoose = require('mongoose');
const { round2 } = require('../utils/money');

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    month: {
      type: String, // "YYYY-MM"
      required: [true, 'Month is required'],
      trim: true,
    },
    totalEligibleDays: {
      type: Number,
      default: 0,
    },
    presentDays: {
      type: Number,
      default: 0,
    },
    halfDays: {
      type: Number,
      default: 0,
    },
    absentDays: {
      type: Number,
      default: 0,
    },
    leaveDays: {
      type: Number,
      default: 0,
    },
    dailyWage: {
      type: Number,
      default: 0,
      set: (val) => round2(val),
    },
    grossAmount: {
      type: Number,
      default: 0,
      set: (val) => round2(val),
    },
    advances: {
      type: Number,
      default: 0,
      set: (val) => round2(val),
    },
    otherDeductions: {
      type: Number,
      default: 0,
      set: (val) => round2(val),
    },
    netPayable: {
      type: Number,
      default: 0,
      set: (val) => round2(val),
    },
    paidAmount: {
      type: Number,
      default: 0,
      set: (val) => round2(val),
    },
    status: {
      type: String,
      enum: ['Draft', 'Finalized', 'Partially Paid', 'Paid'],
      default: 'Draft',
    },
    finalizedAt: {
      type: Date,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

payrollSchema.virtual('remainingAmount').get(function () {
  const remaining = (this.netPayable || 0) - (this.paidAmount || 0);
  return round2(Math.max(0, remaining));
});

// Unique index to prevent duplicate payroll for the same employee in the same month
payrollSchema.index({ employee: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
