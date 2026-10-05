const mongoose=require("mongoose");
// mongoose.set('strictQuery',true);


vehicleSchema=mongoose.Schema({
 
  Vehicle_name:{
    type: String,
    required: true
  },
  
  Vehicle_number:{
    type:String,
    required:true
  }
})


module.exports = mongoose.model("vehicle",vehicleSchema)