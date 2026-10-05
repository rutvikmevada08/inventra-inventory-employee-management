const mongoose = require("mongoose");
// mongoose.set('strictQuery',true);

var fuelSchema = mongoose.Schema({
  Vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "vendor",
    required: true,
  },
  Date: {
    type: Date,

    required: true,
  },
  Litre: {
    type: Number,
    required: true,
  },
  Cost_per_litre: {
    type: Number,
    required: true,
  },
  Total: {
    type: Number,
    required: true,
  },
  Vehicle_num:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'vehicle',
    required:true,
  },
  Fueled_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "employee",
    required: true,
  },
  Invoice_number:{
    type:String,
    
  },
  Invoice:{
    type:String,
    
  }
});

module.exports = mongoose.model("fuel", fuelSchema);
