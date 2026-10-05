const Employee = require('./../../models/employees');

const isAdminLoggedIn = async (req, res, next) => {
    try {
        if (req.cookies.admin_id) {
            const that_admin = await Employee.findOne({ Email: req.cookies.admin_id });
            if (that_admin) {
                return next();
            } else {
                req.flash('error', 'Invalid admin credentials');
                return res.redirect('/');
            }
        } else {
            req.flash('error', 'You are not logged in');
            return res.redirect('/');
        }
    } catch (error) {
        console.error('Error in isAdminLoggedIn middleware:', error);
        req.flash('error', 'An unexpected error occurred');
        return res.redirect('/');
    }
};

module.exports = isAdminLoggedIn;
