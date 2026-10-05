


var logout = async (req,res,next)=>{

    if(req.cookies.employee_id){  
     req.flash('message','Logged out successfully!')
  
      res.clearCookie("employee_id");
      res.redirect('/employee_login')
    }else if(req.cookies.admin_id){
     req.flash('message','Logged out successfully!')
      res.clearCookie("admin_id");
      res.redirect('/admin_login')
  
    }
  
  }
  module.exports = logout;