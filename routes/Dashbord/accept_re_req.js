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
const sendMail = require('./../ohter_functions/sendMail')

const accept_re_req = async (req, res, next) => {
  try {
    const { req_id,Paid_by } = req.body;

    // Check if request ID is provided
    if (!req_id) {
      req.flash("error", "Request ID is required.");
      return res.redirect("/");
    }

    // Find the reimbursement request by ID
    const reimbursementReq = await reimbursement_req.findById(req_id).populate('Employee');

    // Check if reimbursement request is found
    if (!reimbursementReq) {
      req.flash("error", "Reimbursement request not found.");
      return res.redirect("/");
    }

    // Create a new reimbursement object with status Pending
    const newReimbursement = new Reimbursement({
      employee: reimbursementReq.Employee,
      Date: reimbursementReq.Date,
      Amount: reimbursementReq.requested_amount,
      Spent_on: reimbursementReq.reason,
      Status: "Pending",
      Invoice_number: reimbursementReq.Invoice_number,
      Vendor: reimbursementReq.Vendor,
      Paid_by
    });

    // Save the new reimbursement object
    await newReimbursement.save();



    var to = reimbursementReq.Employee.Email
    var subject = "Item Request Accepted."
    var Text = `Hi Dear ${reimbursementReq.Employee.Name}, we hope this message finds you well.This mail to inform you that your reimbursement request for INR ${reimbursementReq.requested_amount} is accepted. 
    The amount will be credited in your account soon. 
    
    Thank you.`

     sendMail(to,subject,Text)

    // Delete the original reimbursement request
    await reimbursement_req.findByIdAndDelete(req_id);


    

    // Set success message
    req.flash("message", "Reimbursement request accepted successfully.");
    res.redirect("/");
  } catch (error) {
    console.error("Error accepting reimbursement request:", error);
    req.flash(
      "error",
      "Something went wrong while accepting the reimbursement request."
    );
    res.redirect("/");
  }
};

module.exports = accept_re_req;
