
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


 const get_investor_sheet =  async (req, res, next) => {
    try {
      var { from_date, to_date } = req.body;
  
      // Convert from_date and to_date to JavaScript Date objects
      from_date = new Date(from_date);
      to_date = new Date(to_date);
  
      // Adjust to_date to include the entire day by setting it to the end of the day
      to_date.setHours(23, 59, 59, 999);
  
      // Define query to filter data based on the date range
      const dateQuery = {
        Date: {
          $gte: from_date,
          $lte: to_date,
        },
      };
  
      // Query Lot data within the specified date range
      const data = await Lot.find({
        Purchase_date: {
          $gte: from_date,
          $lte: to_date,
        },
      }).populate("Vendor");
  
      // Query Fuel data within the specified date range
      const fuel_data = await Fuel.find(dateQuery)
        .populate("Vendor")
        .populate("Vehicle_num");
  
      // Query Reimbursement data within the specified date range
      const reimbursement_data = await Reimbursement.find(dateQuery).populate(
        "employee"
      );
  
      // Write data to Excel
      
      writeToExcel(data, fuel_data, reimbursement_data, res, req);
    } catch (error) {

      console.error("Error generating investor sheet:", error);
      req.flash('error', 'Something Went Wrong!!!')
      res.status(500).send("Error generating investor sheet.");
    }
  }

  module.exports = get_investor_sheet;

  // dil burdh az nan dee roz shame 
  // fitna taraze mahashar khirame 
  // roo e mubinash subahe tajalla
  // lah e jabeen nash maah e tamame 
  // pushki khate u sumbul ba gulshan 
  // lali labe u bada bajame 
  // aan tere abru van teere muzgaan 
  // aamadha har ek barqatle aame 
  // gaah e bamasti taau se raksan
  // gaah e bashokhi aahun khiraame 
  // az jism e larza larza do aalam 
  // vaz zulf e barham barham nizaame 


  // mukh chandr badar shah sani hai 
  // mathey chamke laat nurani hai 
  // kaali zulf te ankh mastani hai 
  // makhamur akhi hind mad bhariya 
  
  // aaj sikh mitra di badheri hai 
  // kyu dildi udaas ghaneri hai 
  // noo noo wich shouq changeri hai 
  // aaj naina ne laiya kyu jhadiya ...

  // is soorat nu mai jaan aankhan 
  // jaana te jaan jahaan aankha 
  // sach aankha te rab di shaan aankha 
  // jis shaan to shanna sab baniya 
