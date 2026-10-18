const mongoose = require('mongoose');
const { round2 } = require('../utils/money');

const advanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
      set: (val) => round2(val),
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    payrollMonth: {
      type: String, // e.g. "2026-10"
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Deducted', 'Cancelled'],
      default: 'Pending',
    },
    reference: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

advanceSchema.index({ employee: 1, date: -1 });

module.exports = mongoose.model('Advance', advanceSchema);
