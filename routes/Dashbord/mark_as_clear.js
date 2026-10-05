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


async function mark_as_clear (req,res,next){

    try {
      var { lot_id } = req.body;
      if(!lot_id){
        req.flash('error', 'Lot Id not found !!')
        res.redirect('/Item')
      }else{
    
        var lot = await Lot.findOne({ _id: lot_id})
        lot.Total_paid = lot.Total_payable
        await lot.save();
        req.flash('message', 'Marked As Clear !!')
        res.redirect('/Item')
      }
    } catch (error) {
      req.flash('error', 'Something Went Wrong !!')
      res.redirect('/Item')
    }
      
    
    
    
    
    }

module.exports = mark_as_clear