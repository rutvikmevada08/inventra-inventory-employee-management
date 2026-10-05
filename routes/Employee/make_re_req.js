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
const make_re_req = async (req, res, next) => {
  try {
    var { employee_id, amount, reason, date, Vendor, Invoice_number } =
      req.body;
      if(Vendor == ""){
        Vendor = "NA"
      }
      if(Invoice_number ==""){
        Invoice_number = "NA"
      }

    const new_r_request = new reimbursement_req({
      Employee: employee_id,
      requested_amount: amount,
      reason: reason,
      Date: date,
      Vendor,
      Invoice_number,
    });

    await new_r_request.save();

    var employee = await Employee.findOne({_id: employee_id.trim()})
    

    var to = 'amrita@swaayatt.com'
    var subject = "New Reimbursement Request"
    var Text = `Hi Dear Amrita, we hope this message finds you well.This mail to inform you that ${employee.Name} requested reimbursement of INR ${new_r_request.requested_amount}.
    The reason for this is ${new_r_request.reason}.
    Thank you.`

     sendMail(to,subject,Text)


    res.redirect("/employee-specific");
  } catch (error) {
    console.error("Error making reimbursement request:", error);
    req.flash("error", "Internal server error");
    res.redirect("/employee-specific");
  }
};

module.exports = make_re_req;
