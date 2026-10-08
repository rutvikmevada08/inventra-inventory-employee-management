const mongoose = require("mongoose");

var itemTypeSchema = mongoose.Schema(
  {
    Type_name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    unit: {
      type: String,
      trim: true,
      default: "pcs",
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.itemType || mongoose.model("itemType", itemTypeSchema);