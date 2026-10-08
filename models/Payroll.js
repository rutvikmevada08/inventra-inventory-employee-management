const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employee",
      required: true,
    },
    month: {
      type: String, // "YYYY-MM"
      required: true,
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
      set: (val) => Math.round(val * 100) / 100,
    },
    grossAmount: {
      type: Number,
      default: 0,
      set: (val) => Math.round(val * 100) / 100,
    },
    advances: {
      type: Number,
      default: 0,
      set: (val) => Math.round(val * 100) / 100,
    },
    otherDeductions: {
      type: Number,
      default: 0,
      set: (val) => Math.round(val * 100) / 100,
    },
    netPayable: {
      type: Number,
      default: 0,
      set: (val) => Math.round(val * 100) / 100,
    },
    paidAmount: {
      type: Number,
      default: 0,
      set: (val) => Math.round(val * 100) / 100,
    },
    status: {
      type: String,
      enum: ["Draft", "Finalized", "Partially Paid", "Paid"],
      default: "Draft",
    },
    finalizedAt: {
      type: Date,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

// Virtual for remaining payable
payrollSchema.virtual("remainingAmount").get(function () {
  const remaining = (this.netPayable || 0) - (this.paidAmount || 0);
  return Math.round(Math.max(0, remaining) * 100) / 100;
});

// Unique index to prevent duplicate payroll for the same employee in the same month
payrollSchema.index({ employee: 1, month: 1 }, { unique: true });

module.exports = mongoose.models.Payroll || mongoose.model("Payroll", payrollSchema);
