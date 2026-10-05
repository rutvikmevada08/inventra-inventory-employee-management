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
const sendMail = require('./../ohter_functions/sendMail')
const reject_i_req = async (req, res, next) => {
  try {
    // Extract req_id from req.body
    const { req_id } = req.body;

    // Check if req_id is missing
    if (!req_id) {
      req.flash("error", "Request ID is missing");
      return res.redirect("/");
    }

    // Find the reimbursement request object
    const item_r = await item_req.findById(req_id).populate('Employee').populate('item');

    if (!item_r) {
      req.flash("error", "Reimbursement request not found");
      return res.redirect("/");
    }

    // Update the status to Rejected
    item_r.Status = "Rejected";
    await item_r.save();


    var to = item_r.Employee.Email;
    var subject = "Item Request Rejected"
    var Text = `Hi Dear ${item_r.Employee.Name}, we hope this message finds you well.This mail is to inform you that your item request for ${item_r.item.Type_name} is rejected.
    
    In case of any queries please contact amrita@swaayatt.com. 
    
    Thank you.`

    sendMail(to,subject,Text)


    req.flash("message", "Reimbursement request rejected successfully");
    res.redirect("/");
  } catch (error) {
    console.error("Error rejecting reimbursement request:", error);
    req.flash("error", "Internal server error");
    res.redirect("/");
  }
};

module.exports = reject_i_req;
