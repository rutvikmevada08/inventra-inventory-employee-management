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

const mark_as_reimb = async (req, res) => {
  try {
    const { R_id } = req.body;

    // Ensure R_id is provided in the request body
    if (!R_id) {
      req.flash("error", "Reimbursement ID is required");
      return res.redirect("/reimbursement");
    }

    // Find the reimbursement document by ID
    const reimbursement = await Reimbursement.findById(R_id);

    // Check if the reimbursement document is found and if found we can reduce the size of the following...
    
    if (!reimbursement) {
      req.flash("error", "Reimbursement not found");
      return res.redirect("/reimbursement");
    }

    // Update the Status to "Reimbursed"
    reimbursement.Status = "Reimbursed";

    // Save the updated reimbursement document
    await reimbursement.save();

    // Set flash message and redirect to the page displaying reimbursement data
    req.flash("message", "Reimbursement marked as reimbursed");
    res.redirect("/reimbursement");
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal Server Error");
    res.redirect("/reimbursement");
  }
};

module.exports = mark_as_reimb;
