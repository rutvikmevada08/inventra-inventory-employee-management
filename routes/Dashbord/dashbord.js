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

const Dashbord = async (req, res, next) => {
  try {
    const promiseResult = await Promise.allSettled([
      await Vendor.find(),
      await Employee.find(),
      await reimbursement_req.find().populate("Employee"),
      await item_req
        .find({ Status: "Requested" })
        .populate("Employee")
        .populate("item"),
      await Lot.find(),
      await fuel.find(),
      await Reimbursement.find()

      ]);

    let [vendors, employees, reim_requests, item_requests,Lot_data,fuel_data,reimbursement_data] = promiseResult
      .filter((data) => data.status === "fulfilled")
      .map((data) => data.value);

    req.flash("message", "Welcome To Dashboard !");

    res.render("index.ejs", {
      reimbursement_data,
      fuel_data,
      Lot_data,
      vendors,
      employees,
      reim_requests,
      item_requests,
      message: req.flash("message"),
      bad_alert: req.flash("error"),
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal Server Error");
    res.redirect("/");
  }
};

module.exports = Dashbord;
