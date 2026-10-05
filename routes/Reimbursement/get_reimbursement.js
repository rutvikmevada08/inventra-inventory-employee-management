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
const misc_types = require("../../miscellaneous");

const get_reimb = async (req, res, next) => {
  try {
    // Fetch vendors and employees
    const vendorsPromise = Vendor.find();
    const employeesPromise = Employee.find();

    // Fetch reimbursement data for the current month with Status: Reimbursed
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

    const reimbursementDataPromise = Reimbursement.aggregate([
      {
        $match: {
          Date: { $gte: currentMonthStart, $lte: currentMonthEnd },
          Status: "Reimbursed",
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: "$employee",
      },
    ]);

    const pendingReimbursementDataPromise = Reimbursement.aggregate([
      {
        $match: {
          Date: { $gte: currentMonthStart, $lte: currentMonthEnd },
          Status: "Pending",
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: "$employee",
      },
    ]);

    // Wait for all promises to settle
    const [vendors, employees, reimbursementData, pendingReimbursementData] =
      await Promise.allSettled([
        vendorsPromise,
        employeesPromise,
        reimbursementDataPromise,
        pendingReimbursementDataPromise,
      ]);

    // Check if any promise failed
    if (
      vendors.status === "rejected" ||
      employees.status === "rejected" ||
      reimbursementData.status === "rejected" ||
      pendingReimbursementData.status === "rejected"
    ) {
      req.flash("error", "Failed to fetch reimbursement data");
      return res.redirect("/reimbursement");
    }

    // Unwrap the values from settled promises
    const vendorsData = vendors.value;
    const employeesData = employees.value;
    const reimbursementDataEntries = reimbursementData.value;
    const pendingReimbursementDataEntries = pendingReimbursementData.value;

    // Calculate total reimbursed amounts
    const totalReimbursedAmount = reimbursementDataEntries.reduce(
      (total, reimbursement) => total + reimbursement.Amount,
      0
    );
    const pendingTotalReimbursedAmount = pendingReimbursementDataEntries.reduce(
      (total, reimbursement) => total + reimbursement.Amount,
      0
    );

    // Fetch full reimbursement data
    const fullReimbursementPromise = Reimbursement.find().populate("employee");
    const [fullReimbursement] = await Promise.allSettled([
      fullReimbursementPromise,
    ]);
    // console.log(fullReimbursement) this is to show the reimbursement that does the impact on the server site
    

    // Check if fetching full reimbursement data failed
    if (fullReimbursement.status === "rejected") {
      req.flash("error", "Failed to fetch full reimbursement data");
      return res.redirect("/reimbursement");
    }

    // Unwrap the value from the settled promise
    const fullReimbursementData = fullReimbursement.value;

    // Render the reimbursement page with all the data
    res.render("reimbursement.ejs", {
      misc_types,
      vendors: vendorsData,
      employees: employeesData,
      reimbursement_data: reimbursementDataEntries,
      totalReimbursedAmount: totalReimbursedAmount,
      pending_reimbursement_data: pendingReimbursementDataEntries,
      pending_totalReimbursedAmount: pendingTotalReimbursedAmount,
      full_reimbursement: fullReimbursementData,
      message: req.flash("message"),
      bad_alert: req.flash("error"),

    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal Server Error");
    res.redirect("/reimbursement");
  }
};

module.exports = get_reimb;


