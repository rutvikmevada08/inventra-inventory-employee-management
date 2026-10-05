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


const add_item_types = async (req, res, next) => {
  try {
      const { Type_name } = req.body;

      if (!Type_name) {
          req.flash("error", "Type name is required");
          return res.redirect("/Item");
      }

      const newType = new Item_type({
          Type_name,
      });
      await newType.save();

      req.flash("message", "Item type added successfully");
      res.redirect("/Item");
  } catch (error) {
      console.error(error);
      req.flash("error", "Failed to add item type");
      res.redirect("/Item");
  }
}

module.exports = add_item_types;
