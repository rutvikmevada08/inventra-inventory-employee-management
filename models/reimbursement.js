const mongoose = require("mongoose");

var reimbursementSchema = mongoose.Schema(
  {
    Vendor: {
      type: String,
      trim: true,
    },
    Invoice_number: {
      type: String,
      trim: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employee",
      required: true,
    },
    Date: {
      type: Date,
      required: true,
    },
    Amount: {
      type: Number,
      required: true,
      min: 0,
    },
    Spent_on: {
      type: String,
      required: true,
      trim: true,
    },
    Status: {
      type: String,
      enum: ["Requested", "Approved", "Paid", "Rejected", "Pending", "Reimbursed"],
      default: "Requested",
      required: true,
    },
    Paid_by: {
      type: String,
      trim: true,
    },
    Invoice: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

reimbursementSchema.index({ Date: -1 });
reimbursementSchema.index({ employee: 1 });
reimbursementSchema.index({ Status: 1 });

module.exports = mongoose.models.reimbursement || mongoose.model("reimbursement", reimbursementSchema);
