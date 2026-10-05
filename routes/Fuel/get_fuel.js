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

const get_fuel = async (req, res, next) => {
  try {
      // Fetch data from the database
      const vehiclesPromise = Vehicle.find();
      const vendorsPromise = Vendor.find();
      const employeesPromise = Employee.find();
      const fuelDataPromise = Fuel.find().populate("Vendor").populate("Fueled_by").populate('Vehicle_num');
      
      // Wait for all promises to settle
      const [vehicles, vendors, employees, fuelData] = await Promise.allSettled([
          vehiclesPromise,
          vendorsPromise,
          employeesPromise,
          fuelDataPromise
      ]);

      // Check if any promise failed
      if (vehicles.status === "rejected" || vendors.status === "rejected" || employees.status === "rejected" || fuelData.status === "rejected") {
          req.flash("error", "Failed to fetch fuel data");
          return res.redirect("/fuel");
      }

      // Unwrap the values from settled promises
      const vehiclesData = vehicles.value;
      const vendorsData = vendors.value;
      const employeesData = employees.value;
      const fuelDataEntries = fuelData.value;

      // Calculate metrics for the current month
      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const currentMonthEntries = fuelDataEntries.filter(entry => entry.Date >= currentMonthStart && entry.Date <= currentMonthEnd);
      const totalLitresThisMonth = currentMonthEntries.reduce((total, entry) => total + entry.Litre, 0);
      const totalInvestmentThisMonth = currentMonthEntries.reduce((total, entry) => total + entry.Total, 0);

      // Render the fuel page with fetched data and metrics
      res.render("fuel.ejs", {
          vendors: vendorsData,
          employees: employeesData,
          fuelData: fuelDataEntries,
          currentMonthEntries,
          totalLitresThisMonth,
          totalInvestmentThisMonth,
          vehicles: vehiclesData,
          message: req.flash("message"),
          bad_alert: req.flash("error"),
      });
  } catch (error) {
      console.error("Error fetching fuel data:", error);
      req.flash("error", "Internal server error");
      res.redirect("/fuel");
  }
};

module.exports = get_fuel;

