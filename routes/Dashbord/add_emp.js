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

const add_emp = async (req, res, next) => {
  try {
    const { Name, Email, Number } = req.body;

    // Check if required fields are provided
    if (!Name || !Email || !Number) {
      req.flash("error", "Name, Email, and Number are required.");
      return res.redirect("/");
    }

    // Create a new employee object
    const newEmployee = new Employee({ Name, Email, Number });

    // Save the new employee object
    await newEmployee.save();

    // Set success message
    req.flash("message", "Employee added successfully.");
    res.redirect("/");
  } catch (error) {
    console.error("Error adding employee:", error);
    req.flash("error", "Something went wrong while adding the employee.");
    res.redirect("/");
  }
};

module.exports = add_emp;

