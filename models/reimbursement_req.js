const mongoose=require("mongoose");
// mongoose.set('strictQuery',true);


reimbursement_reqSchema=mongoose.Schema({
 
  Employee:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'employee',
    required: true

  },
  requested_amount:{
    type:Number,
    required:true
  },
  reason:{
    type:String,
    required:true
  },
  Date:{
    type:Date,
    required:true
  },
  Item:{
    type:String,

  },
  Invoice_number:{
    type:String,

  },
  Vendor:{
    type:String,
    
  }
  
})


module.exports = mongoose.model("reimbursement_req",reimbursement_reqSchema)