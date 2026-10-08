const mongoose = require("mongoose");

const advanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employee",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
      set: (val) => Math.round(val * 100) / 100,
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
      enum: ["Pending", "Deducted", "Cancelled"],
      default: "Pending",
    },
    reference: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

advanceSchema.index({ employee: 1, date: -1 });

module.exports = mongoose.models.Advance || mongoose.model("Advance", advanceSchema);
