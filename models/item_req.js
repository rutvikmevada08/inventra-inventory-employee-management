const mongoose = require("mongoose");

var item_reqSchema = mongoose.Schema(
  {
    Employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employee",
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "itemType",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    Date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    Quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    Status: {
      type: String,
      required: true,
      enum: ["Requested", "Approved", "Rejected", "Issued"],
      default: "Requested",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    issuedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

item_reqSchema.index({ Status: 1 });
item_reqSchema.index({ Employee: 1 });
item_reqSchema.index({ Date: -1 });

module.exports = mongoose.models.item_req || mongoose.model("item_req", item_reqSchema);