const mongoose=require("mongoose");
// mongoose.set('strictQuery',true);


var lotSchema=mongoose.Schema({
  Lot_type:{
    type:String,
    
  },
  Paid_by:{
    type:String,

  },
  Items:[{
    type: mongoose.Schema.Types.ObjectId,
    ref:'item'
  }],
  Vendor:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'vendor',
    required: true
  },
  Purchase_date:{
    type: Date,
    required: true
  },
  Received:{
    type: Boolean,
    required: true
  },
  Invoice_number:{
    type: String,
    required: true
  },
  Total_payable:{
    type: Number,
    required:true
  },
  Total_paid:{
    type:Number,
    required:true
  },
  Invoice:{
    type:String,
    required:true
  },
  Description:{
    type:String
  }
})


module.exports = mongoose.model("lot",lotSchema)