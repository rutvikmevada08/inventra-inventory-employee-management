const mongoose = require("mongoose");

var lotSchema = mongoose.Schema(
  {
    Lot_type: {
      type: String,
      trim: true,
    },
    Paid_by: {
      type: String,
      trim: true,
    },
    Items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "item",
      },
    ],
    Vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendor",
      required: true,
    },
    Purchase_date: {
      type: Date,
      required: true,
    },
    Received: {
      type: Boolean,
      default: false,
    },
    receivedAt: {
      type: Date,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    Invoice_number: {
      type: String,
      required: true,
      trim: true,
    },
    Total_payable: {
      type: Number,
      required: true,
      min: 0,
    },
    Total_paid: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    Invoice: {
      type: String,
      required: true,
    },
    Description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

lotSchema.index({ Purchase_date: -1 });
lotSchema.index({ Vendor: 1 });
lotSchema.index({ Invoice_number: 1 });

module.exports = mongoose.models.lot || mongoose.model("lot", lotSchema);