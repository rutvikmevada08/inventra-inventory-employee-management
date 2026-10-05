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

const add_vehicle = async (req, res, next) => {
  try {
    const { Vehicle_name, Vehicle_number } = req.body;

    // Check if required fields are provided
    if (!Vehicle_name || !Vehicle_number) {
      req.flash("error", "Vehicle name and number are required.");
      return res.redirect("/fuel");
    }

    // Create a new vehicle object
    const newVehicle = new Vehicle({
      Vehicle_name,
      Vehicle_number,
    });

    // Save the new vehicle object
    await newVehicle.save();

    // Set success message
    req.flash("message", "Vehicle added successfully.");
    res.redirect("/fuel");
  } catch (error) {
    console.error("Error adding vehicle:", error);
    req.flash("error", "Something went wrong while adding the vehicle.");
    res.redirect("/fuel");
  }
};

module.exports = add_vehicle;
