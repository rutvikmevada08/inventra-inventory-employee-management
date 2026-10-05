const mongoose=require("mongoose");
// mongoose.set('strictQuery',true);


item_reqSchema=mongoose.Schema({
 
  Employee:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'employee',
    required: true

  },
  item:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'itemType',
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
  Quantity:{
    type:Number,
    required:true
  },
  Status:{
type:String,
required:true,
default:"Requested"
  }
})


module.exports = mongoose.model("item_req",item_reqSchema)