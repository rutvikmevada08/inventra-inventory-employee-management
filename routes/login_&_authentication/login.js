const Employee = require("./../../models/employees"); // Assuming 'Employee' is a model
// const Admin = require('./../../models/admin');

const eightHours = 8 * 60 * 60 * 1000;

async function login(req, res, next) {
    try {
        const { employee_email, employee_password, admin_email, admin_password } = req.body;

        if (employee_email && employee_password) {
            await handleEmployeeLogin(employee_email, employee_password, req, res);
        } else if (admin_email && admin_password) {
            await handleAdminLogin(admin_email, admin_password, req, res);
        } else {
            throw new Error("Invalid login credentials");
        }
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong !!');
        res.redirect("/admin_login");
    }
}

async function handleEmployeeLogin(email, password, req, res) {
    const employee = await Employee.findOne({ Email: email });
    if (!employee) {
        req.flash('error', 'Invalid email or password');
        return res.redirect("/employee_login");
    }

    if (employee.Password !== password) {
        req.flash('error', 'Invalid email or password');
        return res.redirect("/employee_login");
    }

    req.flash('message', 'Login successful!!');
    res.cookie("emp_email", `${employee.Email}`, { maxAge: eightHours, httpOnly: true });
    res.redirect("/employee-specific");
}

async function handleAdminLogin(email, password, req, res) {
    // Implement admin login logic here
    // For now, assume similar logic to employee login
    const admin = await Employee.findOne({ Email: email });
    if (!admin) {
        req.flash('error', 'Invalid email or password');
        return res.redirect("/admin_login");
    }

    if (admin.Password !== password) {
        req.flash('error', 'Invalid email or password');
        return res.redirect("/admin_login");
    }

    req.flash('message', 'Login successful!!');
    res.cookie("admin_id", `${admin.Email}`, { maxAge: eightHours, httpOnly: true });
    res.redirect("/dashbord");
}

module.exports = login;
