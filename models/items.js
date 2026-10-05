const mongoose=require("mongoose");
// mongoose.set('strictQuery',true);


var itemSchema=mongoose.Schema({
  Item_type:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'itemType',
    required: true
  },
  Lot_id:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'lot',
    required: true
},
  Cost_per_unit:{
    type: Number,
    required: true
  },
  Quantity:{
    type: Number,
    required: true
  },
  Total_payable:{
    type: Number,
    required: true
  }
})


module.exports = mongoose.model("item",itemSchema)