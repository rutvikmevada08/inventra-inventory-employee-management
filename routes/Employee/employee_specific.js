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
const item_req = require("./../../models/item_req");
const misc_types = require("../../miscellaneous");

const employee_specific = async (req, res, next) => {
  try {
    let emp_email = req.cookies.emp_email;
    let Item_types = await Item_type.find();
    var employee = await Employee.findOne({ Email: emp_email });

    if (!employee) {
      
      req.flash('error', 'Employee not found!!')
      res.redirect('/')
    }else{
      const promiseResult = await Promise.allSettled([
        reimbursement_req.find({ Employee: employee._id }),
        Reimbursement.find({ employee: employee._id, Status: "Pending" }),
        item_req.find({ Employee: employee._id }).populate("item"),
      ]);
  
      const [reim_requests, pending_reims, item_reqs] = promiseResult.map(
        (result) => {
          if (result.status === "fulfilled") {
            return result.value;
          } else {
            throw result.reason;
          }
        }
      );
  
      res.render("employee-specific.ejs", {
        misc_types,
        employee,
        reim_requests,
        pending_reims,
        Item_types,
        item_reqs,
        message: req.flash("message"),
        bad_alert: req.flash("error"),
      });
      
    }

    
  } catch (error) {
    console.error("Error in employee_specific:", error);
    req.flash("error", "Internal server error");
    res.redirect("/");
  }
};

module.exports = employee_specific;
