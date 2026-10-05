

const fs = require('fs')
var emp_login_page = async (req, res, next) => {
    var fileContents;
  
    try {
      // Provide the path to the file you want to read
      fileContents = fs.readFileSync(
        "public/javascripts/departments.json",
        "utf-8"
      );
      fileContents = JSON.parse(fileContents);
    } catch (error) {
      console.error("Error reading the file:", error.message);
    }
    res.render("employee_login.ejs", {
      fileContents,
      message: req.flash('message'),
      bad_alert: req.flash('error'),
    });
  }

  module.exports = emp_login_page;