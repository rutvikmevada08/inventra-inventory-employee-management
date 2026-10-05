var express = require("express");
var router = express.Router();
const Employee = require("./../models/employees");
const Vendor = require("./../models/vendors");
const Fuel = require("./../models/fuel");
const Reimbursement = require("./../models/reimbursement");
const Lot = require("./../models/lots");
const Item_type = require("./../models/item_types");
const Item = require("./../models/items");
const fuel = require("./../models/fuel");
const Vehicle = require("./../models/vehicles");
const reimbursement_req = require("../models/reimbursement_req");
const multer = require("multer");
const Dashbord = require("./Dashbord/dashbord");
const add_emp = require("./Dashbord/add_emp");
const add_vendor = require("./Dashbord/add_vendor");
const get_item = require("./Lots_&_Items/get_item");
const add_refuel = require("./Fuel/add_refuel");
const add_reimbursement = require("./Reimbursement/add_reimbursement");
const add_lot = require("./Lots_&_Items/add_lot");
const get_reimb = require("./Reimbursement/get_reimbursement");
const get_fuel = require("./Fuel/get_fuel");
const add_item_types = require("./Lots_&_Items/add_item_types");
const mark_as_reimb = require("./Reimbursement/mark_as_reimb");
const add_vehicle = require("./Dashbord/add_vehicle");
const make_re_req = require("./Employee/make_re_req");
const employee_specific = require("./Employee/employee_specific");
const accept_re_req = require("./Dashbord/accept_re_req");
const make_item_req = require("./Employee/make_item_req");
const accept_i_req = require("./Dashbord/accept_i_req");
const reject_i_req = require("./Dashbord/reject_i_req");
const reject_re_req = require("./Dashbord/reject_re_req");
const writeToExcel = require("./ohter_functions/writetoexcel");
const multerConf = require("./ohter_functions/multer_config");
const get_investor_sheet = require("./sheets/investor_sheet");
const write_inventory_data = require("./ohter_functions/write_inventory_xl");
const inventorySheet = require("./sheets/inventory_sheet");
const emp_login_page = require("./login_&_authentication/employee_login");
const admin_login_page = require("./login_&_authentication/admin_login");
const login = require("./login_&_authentication/login");
const isAdminLoggedIn = require("./login_&_authentication/is_admin_logged_in");

router.post("/login", login);
router.get("/dashbord", isAdminLoggedIn, Dashbord);
router.post("/add-employee", isAdminLoggedIn, add_emp);
router.post("/add-vendor", isAdminLoggedIn, add_vendor);
router.get("/item", isAdminLoggedIn, get_item);
router.post("/save-lot", multerConf("lot").single("invoice"), add_lot);
router.get("/reimbursement", isAdminLoggedIn, get_reimb);
router.get("/fuel", isAdminLoggedIn, get_fuel);
router.post("/add-item-types", isAdminLoggedIn, add_item_types);
router.post("/mark-as-reimbursed", isAdminLoggedIn, mark_as_reimb);
router.post("/add-vehicle", add_vehicle);
router.post("/make-re-request", make_re_req);
router.get("/employee-specific", employee_specific);
router.post("/accept-r-req", accept_re_req);
router.post("/accept-i-req", accept_i_req);
router.post("/reject-i-req", reject_i_req);
router.post("/reject-r-req", reject_re_req);
router.post("/make-item-req", make_item_req);
router.post("/get-investor-sheet-xl", get_investor_sheet);
router.post("/get-inventory-data-xl", inventorySheet);
router.post("/add-refuel", multerConf("fuel").single("invoice"), add_refuel);
router.get("/employee_login", emp_login_page);

router.post(
  "/add-reimbursement",
  multerConf("reimbursement").single("invoice"),
  add_reimbursement
);



router.get("/", async (req, res, next) => {
  if (req.cookies.admin_id) {
    const that_admin = await Employee.findOne({ Email: req.cookies.admin_id });
    if (that_admin) {
      return res.redirect("/dashbord");
    }
  } else if (req.cookies.emp_email) {
    const that_employee = await Employee.findOne({
      Email: req.cookies.admin_id,
    });
    if (that_employee) {
      return res.redirect("/employee-specific");
    }
  } else {
    res.render("initial.ejs");
  }
});


router.get("/admin_login", admin_login_page);
router.get("/profile", (req, res) => {
  res.render("profile");
});



// special case to delete data

router.post("/delete-data", async (req, res, next) => {
  try {
    const { id_to_delete, type } = req.body;

    switch (type) {
      case "reimbursement":
        await Reimbursement.findByIdAndDelete(id_to_delete);
        res.redirect("/reimbursement");
        break;
      case "fuel":
        await Fuel.findByIdAndDelete(id_to_delete);
        res.redirect("/fuel");

        break;
      case "lot":
        await Lot.findByIdAndDelete(id_to_delete);
        res.redirect("/Item");

        break;
      default:
        // Handle the case where the type is not recognized
        return res.status(400).send("Invalid document type");
    }

    // Send a success response
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/get-sheets", isAdminLoggedIn, async (req, res, next) => {
  res.render("bug.ejs", {
    message: req.flash("message"),
    bad_alert: req.flash("error"),
  });
});

// sendEmail('pulkitupadhyay2002@gmail.com','For granting leave', 'This is the Mail to inform you  /n the maint stream is the mall /n Best Regards /n PUlkit');
// router.post('/mark-as-clear', )

// Router for handling file upload

// router.post('/upload-invoice',multerConf().single('invoice'), async (req, res, next) => {
// var storage = multerConf('pulkit','fuel');
// the mainstream upload single is not being detected and nor being updated at all cost we need to
// // upload.single('invoice');
//     try {
//         if (!req.file) {
//             // No file uploaded
//             return res.status(400).send('No file uploaded');
//         }
//         const path = req.file.path;
//         console.log('File uploaded:', path);
//         // Handle saving the file path to the database here
//         res.send('File uploaded successfully');

//     } catch (error) {
//         console.error('Error uploading file:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });

module.exports = router;


// I have to make the form for one or more items in the employee dashboard and also add it to backend.

