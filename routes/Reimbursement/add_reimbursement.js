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
const add_reimbursement = async (req, res, next) => {
  try {
    // Extract refuel details from the request body
    let { employee, Date, Amount, Spent_on, Status, Invoice_number, Vendor,Paid_by } =
      req.body;

    // Check for missing or empty values
    if (!employee || !Date || !Amount || !Spent_on || !Status) {
      req.flash("error", "Missing required fields.");
      return res.redirect("/reimbursement");
    }

    // Check for empty Invoice_number or Vendor
    if (!Invoice_number) {
      Invoice_number = "NA";
    }
    if (!Vendor) {
      Vendor = "NA";
    }

    // Create a new reimbursement instance
    const newreimbursement = new Reimbursement({
  employee,
  Date,
  Amount,
  Spent_on,
  Status,
  Invoice_number,
  Vendor,
  Paid_by,
});

// Conditionally set Invoice field if req.file.path is defined
if (req.file && req.file.path) {
  newreimbursement.Invoice = req.file.path;
}

    // Save the new reimbursement data to the database
    req.flash("message", "Reimbursement added.");
    await newreimbursement.save();

    // Redirect to the /reimbursement route after saving
    res.redirect("/reimbursement");
  } catch (error) {
    console.log(error)
    req.flash("error", "There was some problem adding Reimbursement.");
    res.redirect("/reimbursement");
  }
};

module.exports = add_reimbursement;
