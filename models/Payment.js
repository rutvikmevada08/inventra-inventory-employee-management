const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employee",
      required: true,
    },
    payroll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
      set: (val) => Math.round(val * 100) / 100,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Bank Transfer", "Cash", "UPI", "Cheque", "Other"],
      default: "Bank Transfer",
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
      enum: ["Completed", "Voided"],
      default: "Completed",
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
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

paymentSchema.index({ employee: 1, paymentDate: -1 });
paymentSchema.index({ payroll: 1 });

module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
