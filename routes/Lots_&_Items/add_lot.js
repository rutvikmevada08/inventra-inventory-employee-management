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

const add_lot = async (req, res, next) => {
  try {
    var {
      Vendor,
      Purchase_date,
      Paid,
      Invoice_number,
      Total_payable,
      Total_paid,
      Lot_type,
      Paid_by,
      Description
    } = req.body;
    Paid = req.body.Paid === "on";
    console.log(req.body)

    // Check if any required req.body values are missing
    if (
      !Vendor ||
      !Purchase_date ||
      !Invoice_number ||
      !Total_payable ||
      !Total_paid ||
      !Lot_type ||
      !Paid_by
    ) {
      req.flash("error", "Missing required fields");
      // return res.redirect("/Item");
      return res.send( )
    }

    var newLot = new Lot({
      Invoice:req.file.path,
      Vendor,
      Purchase_date,
      Received:Paid,
      Invoice_number,
      Total_payable,
      Total_paid,
      Lot_type,
      Paid_by,
      Description
    });

    await newLot.save();

    const Lot_id = newLot.id;

    const itemQuantity = parseInt(req.body.item_quantity);

    const items = [];

    for (let i = 1; i <= itemQuantity; i++) {
      const Item_type = req.body[`item_${i}_name`];
      const Cost_per_unit = req.body[`item_${i}_price`];
      const Quantity = req.body[`item_${i}_quantity`];
      const Total_payable = req.body[`item_${i}_amount`];

      // Check if any required item details are missing
      if (!Item_type || !Cost_per_unit || !Quantity || !Total_payable) {
        req.flash("error", "Missing required fields for item");
        return res.redirect("/Item");
      }

      items.push({
        Item_type,
        Lot_id,
        Cost_per_unit,
        Quantity,
        Total_payable,
      });
    }

    const insertedItems = await Item.insertMany(items);

    const itemIds = insertedItems.map((item) => item._id);

    await Lot.findByIdAndUpdate(
      Lot_id,
      { $set: { Items: itemIds } },
      { new: true }
    );
      req.flash('message', 'Lot Added Successfully!!')
    res.redirect("/Item");
  } catch (error) {
    console.error(error);
    req.flash("error", "Failed to add lot");
    res.redirect("/Item");
  }
};

module.exports = add_lot;
