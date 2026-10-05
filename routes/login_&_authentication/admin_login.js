

var admin_login_page = async (req, res, next) => {
    res.render("admin_login.ejs", {
      message: req.flash('message'),
      bad_alert: req.flash('error'),
    });
  }
module.exports = admin_login_page;
  