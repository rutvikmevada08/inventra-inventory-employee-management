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
const writeToExcel = require("../ohter_functions/writetoexcel");
const write_inventory_data = require('../ohter_functions/write_inventory_xl')
const inventorySheet = async (req, res, next) => {
    let { from_date, to_date } = req.body;
  
    // Convert from_date and to_date to JavaScript Date objects
    from_date = new Date(from_date);
    to_date = new Date(to_date);
  
    // Adjust to_date to include the entire day by setting it to the end of the day
    to_date.setHours(23, 59, 59, 999);
  
    try {
      // Define query to filter data based on the date range
      const dateQuery = {
        Purchase_date: {
          $gte: from_date,
          $lte: to_date,
        },
      };
  
      // Query Lot data within the specified date range
      const data = await Lot.find(dateQuery)
        .populate("Vendor")
        .populate({ path: "Items", populate: "Item_type" });
  
      data.sort((a, b) => new Date(a.Purchase_date) - new Date(b.Purchase_date));
  
      // Return the data to the client or process it further
      write_inventory_data(data, res, req);
    } catch (error) {
      // Handle errors
      console.error("Error fetching inventory data:", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching inventory data" });
    }
  }


  module.exports = inventorySheet;