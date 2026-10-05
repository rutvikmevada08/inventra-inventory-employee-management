const mongoose = require("mongoose");
// mongoose.set('strictQuery',true);

var reimbursementSchema = mongoose.Schema({
  Vendor:{
    type:String   
  },
  Invoice_number:{
    type:String   
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "employee",
    required: true,
  },
  Date: {
    type: Date,

    required: true,
  },
  Amount: {
    type: Number,
    required: true,
  },
  Spent_on: {
    type: String,
    required: true,
  },
  Status: {
    type: String,
    required: true,
  },
  Paid_by:{
    type: String,

  },
 Invoice:{
    type: String,
    
  }
});

module.exports = mongoose.model("reimbursement", reimbursementSchema);
