const mongoose = require("mongoose");

const inventoryLedgerSchema = new mongoose.Schema(
  {
    itemType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "itemType",
      required: true,
    },
    transactionType: {
      type: String,
      enum: ["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "REVERSAL"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    unitCost: {
      type: Number,
      default: 0,
      set: (val) => Math.round(val * 100) / 100,
    },
    totalCost: {
      type: Number,
      default: 0,
      set: (val) => Math.round(val * 100) / 100,
    },
    referenceType: {
      type: String,
      enum: ["LOT_PURCHASE", "ITEM_REQUEST", "MANUAL_ADJUSTMENT", "RECEIPT_REVERSAL"],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    lot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "lot",
    },
    itemRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "item_req",
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    notes: {
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

inventoryLedgerSchema.index({ itemType: 1, createdAt: -1 });
inventoryLedgerSchema.index({ referenceType: 1, referenceId: 1 });

module.exports = mongoose.models.InventoryLedger || mongoose.model("InventoryLedger", inventoryLedgerSchema);
