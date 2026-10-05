const mongoose=require("mongoose");
// mongoose.set('strictQuery',true);


var itemTypeSchema=mongoose.Schema({
 Type_name:{
    type: String,
    required: true
  }
  
})


module.exports = mongoose.model("itemType",itemTypeSchema)