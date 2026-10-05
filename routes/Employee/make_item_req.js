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
const sendMail = require('./../ohter_functions/sendMail');
const item_types = require("./../../models/item_types");

const make_item_req = async (req, res, next) => {
  try {
    var { employee_id, item, reason, quantity } = req.body;
    var date = new Date();
    const new_i_request = new item_req({
      Employee: employee_id,
      item: item,
      reason: reason,
      Date: date,
      Quantity: quantity
    });

    await new_i_request.save();
    
    var employee = await Employee.findOne({_id: employee_id.trim()})
    var item = await item_types.findOne({_id: new_i_request.item})
console.log(new_i_request.item)
    var to = 'amrita@swaayatt.com'
    var subject = "New Item Request "
    var Text = `Hi Dear Amrita, we hope this message finds you well.This mail to inform you that ${employee.Name} requested ${new_i_request.Quantity} ${item.Type_name}s. 
    
    The reason for this is : ${new_i_request.reason}.
    
    Thank you.`

    sendMail(to,subject,Text)



    res.redirect("/employee-specific");
  } catch (error) {
    console.error("Error making item request:", error);
    req.flash("error", "Something went wrong while making item request..");
    res.redirect("/employee-specific");
  }
};

module.exports = make_item_req;
