const mongoose=require("mongoose");
// mongoose.set('strictQuery',true);


var vendorSchema=mongoose.Schema({
 Business_name:{
    type: String,
    required: true
  },
  Business_email:{
    type: String,
    
    required: true
},
  Business_contact_number:{
    type: Number,
    required: true
  }
  
})


module.exports = mongoose.model("vendor",vendorSchema)