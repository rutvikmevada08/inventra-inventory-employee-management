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

const add_refuel = async (req, res, next) => {
 
 
  try {
    // Extract refuel details from the request body
    const {
      vendor,
      Date,
      Litre,
      Cost_per_litre,
      Total,
      Fueled_by,
      Vehicle_num,
      Invoice_number,
    } = req.body;

    // Check if all required values are provided in req.body
    if (
      !vendor ||
      !Date ||
      !Litre ||
      !Cost_per_litre ||
      !Total ||
      !Fueled_by ||
      !Vehicle_num ||
      !Invoice_number
    ) {
      req.flash("error", "Missing required fields");
      return res.redirect("/fuel");
    }

    // Create a new fuel instance
    const newFuel = new Fuel({
      Vendor: vendor,
      Date,
      Litre,
      Cost_per_litre,
      Total,
      Fueled_by,
      Vehicle_num,
      Invoice_number,
      Invoice:req.file.path
    });

    // Save the new fuel data to the database
    await newFuel.save();

    // Set flash message for success
    req.flash("message", "Fuel added successfully");

    // Redirect to the /fuel route after saving
    res.redirect("/fuel");
  } catch (error) {
    console.error("Error adding refuel:", error);
    req.flash("error", "Internal server error");
    res.redirect("/fuel");
  }
};

module.exports = add_refuel;
