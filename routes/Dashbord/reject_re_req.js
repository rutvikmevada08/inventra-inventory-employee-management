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
const reject_re_req = async (req, res, next) => {
  try {
    // Extract req_id from req.body
    const { req_id } = req.body;

    // Check if req_id is missing
    if (!req_id) {
      req.flash("error", "Request ID is missing");
      return res.redirect("/");
    }

    // Find the reimbursement request object
    const reimbursementReq = await reimbursement_req.findById(req_id).populate('Employee');

    if (!reimbursementReq) {
      req.flash("error", "Reimbursement request not found");
      return res.redirect("/");
    } else {
      await reimbursement_req.findOneAndDelete({ _id: req_id });
      
     
    

    var to = reimbursementReq.Employee.Email;
    var subject = "Reimbursement Request Rejected"
    var Text = `Hi Dear ${reimbursementReq.Employee.Name}, we hope this message finds you well.This mail is to inform you that your reimbursement request of INR ${reimbursementReq.requested_amount} is rejected.
    
    In case of any queries please contact amrita@swaayatt.com. 
    
    Thank you.`

    sendMail(to,subject,Text)


      req.flash("message", "Reimbursement request rejected successfully");
      res.redirect("/");
    }
  } catch (error) {
    console.error("Error rejecting reimbursement request:", error);
    req.flash("error", "Internal server error");
    res.redirect("/");
  }
};

module.exports = reject_re_req;
