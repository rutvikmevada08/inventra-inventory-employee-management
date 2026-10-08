const mongoose = require("mongoose");

var vendorSchema = mongoose.Schema(
  {
    Business_name: {
      type: String,
      required: true,
      trim: true,
    },
    Business_email: {
      type: String,
      trim: true,
    },
    Business_contact_number: {
      type: String, // string accommodates formatted phone numbers or legacy numbers
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
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

vendorSchema.index({ Business_name: 1 });

module.exports = mongoose.models.vendor || mongoose.model("vendor", vendorSchema);