const mongoose = require("mongoose");

var fuelSchema = mongoose.Schema(
  {
    Vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendor",
      required: true,
    },
    Date: {
      type: Date,
      required: true,
    },
    Litre: {
      type: Number,
      required: true,
      min: 0,
    },
    Cost_per_litre: {
      type: Number,
      required: true,
      min: 0,
    },
    Total: {
      type: Number,
      required: true,
      min: 0,
    },
    Vehicle_num: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vehicle",
      required: true,
    },
    Fueled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employee",
      required: true,
    },
    Invoice_number: {
      type: String,
      trim: true,
    },
    Invoice: {
      type: String,
      trim: true,
    },
    Fuel_type: {
      type: String,
      trim: true,
      default: "Diesel",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

fuelSchema.index({ Date: -1 });
fuelSchema.index({ Vehicle_num: 1 });
fuelSchema.index({ Vendor: 1 });

module.exports = mongoose.models.fuel || mongoose.model("fuel", fuelSchema);
