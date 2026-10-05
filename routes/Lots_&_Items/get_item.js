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
const types_of_items = require("../../Service_types");

const get_item = async (req, res, next) => {
  try {
    const Service_types = types_of_items;

    const currentDate = new Date();
    const currentMonthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const currentMonthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const [
      vendors,
      employees,
      itemTypes,
      lots,
      fullLots
    ] = await Promise.all([
      Vendor.find().lean(),
      Employee.find().lean(),
      Item_type.find().lean(),
      Lot.find({
        Purchase_date: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }).populate("Vendor").populate({
        path: 'Items',
        populate: { path: 'Quantity' }
      }).lean(),
      Lot.find().populate('Vendor').populate({
        path: 'Items',
        populate: { path: 'Quantity' }
      }).lean(),
    ]);

    res.render("Item", {
      Service_types,
      vendors,
      employees,
      item_types: itemTypes,
      lots,
      full_lots: fullLots,
      message: req.flash("message"),
      bad_alert: req.flash("error"),
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal Server Error");
    res.redirect("/");
  }
};

module.exports = get_item;
