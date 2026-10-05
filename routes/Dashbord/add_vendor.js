const Employee = require("./../../models/employees");
const Vendor = require("./../../models/vendors");
const Fuel = require("./../../models/fuel");
const Reimbursement = require("./../../models/reimbursement");
const Lot = require("./../../models/lots");
const Item_type = require("./../../models/item_types");
const Item = require("./../../models/items");
const fuel = require("./../../models/fuel");
const Vehicle = require("./../../models/vehicles");
const reimbursement_req = require("../../models/reimbursement_req");

const add_vendor = async (req, res, next) => {
  try {
    const { Business_name, Business_email, Business_contact_number } = req.body;

    // Check if required fields are provided
    if (!Business_name || !Business_email || !Business_contact_number) {
      req.flash(
        "error",
        "Business name, email, and contact number are required."
      );
      return res.redirect("/");
    }

    // Create a new vendor object
    const newVendor = new Vendor({
      Business_name,
      Business_email,
      Business_contact_number,
    });

    // Save the new vendor object
    await newVendor.save();

    // Set success message
    req.flash("message", "Vendor added successfully.");
    res.redirect("/");
  } catch (error) {
    console.error("Error adding vendor:", error);

    // Set error message and redirect
    req.flash("error", "Internal Server Error. Please try again later.");
    res.redirect("/");
  }
};

module.exports = add_vendor;
