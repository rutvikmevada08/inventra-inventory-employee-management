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
const item_req = require("../../models/item_req");
const sendMail = require("../ohter_functions/sendMail");
const { text } = require("body-parser");

const accept_i_req = async (req, res, next) => {
  try {
    const { req_id } = req.body;

    // Check if request ID is provided
    if (!req_id) {
      req.flash("error", "Request ID is required.");
      return res.redirect("/");
    }

    // Find the item request by ID
    const item_r = await item_req.findById(req_id).populate('Employee').populate('item');
// console.log(item_r)
    // Check if item request is found
    if (!item_r) {
      req.flash("error", "Item request not found.");
      return res.redirect("/");
    }

    // Update item request status to "Accepted"
    item_r.Status = "Accepted";
    await item_r.save();

    var to = item_r.Employee.Email
    var subject = "Item Request Accepted."
    var Text = `Hi Dear ${item_r.Employee.Name}, we hope this message finds you well you item request for ${item_r.item.Type_name} is accepted. It will be 
    ordered soon. 
    
    Thank you.`

     sendMail(to,subject,Text)

    // Set success message
    req.flash("message", "Item request accepted successfully.");
    res.redirect("/");
  } catch (error) {
    console.error("Error accepting item request:", error);
    req.flash(
      "error",
      "Something went wrong while accepting the item request."
    );
    res.redirect("/");
  } 
};

module.exports = accept_i_req;
