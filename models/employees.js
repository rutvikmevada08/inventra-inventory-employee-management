const mongoose=require("mongoose");
// mongoose.set('strictQuery',true);


var employeeSchema=mongoose.Schema({
 Name:{
    type: String,
    required: true
  },
  Email:{
    type: String,
    
    required: true
},
Number:{
    type: Number,
    // required: true
  },
  Password:{
    type: String,
    
    
},
  
})


module.exports = mongoose.model("employee",employeeSchema)