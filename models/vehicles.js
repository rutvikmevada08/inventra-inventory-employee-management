const mongoose = require("mongoose");

var vehicleSchema = mongoose.Schema(
  {
    Vehicle_name: {
      type: String,
      required: true,
      trim: true,
    },
    Vehicle_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
      default: "Car",
    },
    status: {
      type: String,
      enum: ["Active", "Under Maintenance", "Inactive"],
      default: "Active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.vehicle || mongoose.model("vehicle", vehicleSchema);