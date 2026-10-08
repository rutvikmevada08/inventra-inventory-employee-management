const express = require("express");
const router = express.Router();
const Employee = require("../../models/employees");
const Attendance = require("../../models/Attendance");
const Payroll = require("../../models/Payroll");
const Advance = require("../../models/Advance");
const Payment = require("../../models/Payment");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// GET /api/employees (List & Search & Filter)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { search, status, department, employmentType } = req.query;
    const filter = {};

    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    }

    if (department) {
      filter.department = department;
    }

    if (employmentType) {
      filter.employmentType = employmentType;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { Name: searchRegex },
        { employeeId: searchRegex },
        { email: searchRegex },
        { Email: searchRegex },
        { phone: searchRegex },
        { department: searchRegex },
        { designation: searchRegex },
      ];
    }

    const employees = await Employee.find(filter)
      .populate("user", "name email role")
      .sort({ isActive: -1, name: 1, Name: 1 });

    return res.json({ employees });
  } catch (error) {
    console.error("Fetch employees error:", error);
    return res.status(500).json({ error: "Failed to fetch employees." });
  }
});

// GET /api/employees/:id (View Employee Detail)
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate("user", "name email role");
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }
    return res.json({ employee });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch employee details." });
  }
});

// GET /api/employees/:id/financial-summary (Complete financial & attendance history)
router.get("/:id/financial-summary", authenticateToken, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    // Attendance summary
    const attendances = await Attendance.find({ employee: employee._id }).sort({ date: -1 }).limit(100);
    const presentCount = attendances.filter((a) => a.status === "Present").length;
    const halfDayCount = attendances.filter((a) => a.status === "Half Day").length;
    const absentCount = attendances.filter((a) => a.status === "Absent").length;
    const leaveCount = attendances.filter((a) => a.status === "Leave").length;
    const totalEligibleDays = presentCount * 1.0 + halfDayCount * 0.5;

    // Advances
    const advances = await Advance.find({ employee: employee._id }).sort({ date: -1 });
    const totalAdvances = advances.reduce((sum, a) => sum + (a.status !== "Cancelled" ? a.amount : 0), 0);

    // Payroll records
    const payrolls = await Payroll.find({ employee: employee._id }).sort({ month: -1 });

    // Payments
    const payments = await Payment.find({ employee: employee._id }).sort({ paymentDate: -1 });
    const totalPaid = payments.reduce((sum, p) => sum + (p.status === "Completed" ? p.amount : 0), 0);

    // Total net payable across finalized/pending payrolls
    const totalNetPayable = payrolls.reduce((sum, p) => sum + (p.status !== "Draft" ? p.netPayable : 0), 0);
    const outstandingPayable = Math.max(0, Math.round((totalNetPayable - totalPaid) * 100) / 100);

    return res.json({
      employee,
      attendanceSummary: {
        totalRecords: attendances.length,
        presentCount,
        halfDayCount,
        absentCount,
        leaveCount,
        totalEligibleDays,
        recentAttendances: attendances.slice(0, 15),
      },
      advances: {
        totalAdvances: Math.round(totalAdvances * 100) / 100,
        records: advances,
      },
      payrolls,
      payments: {
        totalPaid: Math.round(totalPaid * 100) / 100,
        records: payments,
      },
      financialStatus: {
        totalNetPayable: Math.round(totalNetPayable * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        outstandingPayable,
      },
    });
  } catch (error) {
    console.error("Employee financial summary error:", error);
    return res.status(500).json({ error: "Failed to fetch employee financial summary." });
  }
});

// POST /api/employees (Create Employee - Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      employeeId,
      name,
      email,
      phone,
      address,
      department,
      designation,
      joiningDate,
      employmentType,
      dailyWage,
      monthlySalary,
      notes,
      userId,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Employee full name is required." });
    }

    // Check duplicate employeeId if provided
    if (employeeId) {
      const existing = await Employee.findOne({ employeeId: employeeId.trim() });
      if (existing) {
        return res.status(400).json({ error: "Employee ID already exists." });
      }
    }

    const employee = new Employee({
      employeeId: employeeId ? employeeId.trim() : undefined,
      name: name.trim(),
      Name: name.trim(),
      email: email ? email.trim() : undefined,
      Email: email ? email.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      Number: phone && !isNaN(phone) ? Number(phone) : undefined,
      address: address ? address.trim() : "",
      department: department ? department.trim() : "Operations",
      designation: designation ? designation.trim() : "Worker",
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      employmentType: employmentType || "Daily Wage",
      dailyWage: dailyWage ? Math.round(Number(dailyWage) * 100) / 100 : 0,
      monthlySalary: monthlySalary ? Math.round(Number(monthlySalary) * 100) / 100 : 0,
      notes: notes ? notes.trim() : "",
      user: userId || undefined,
      isActive: true,
    });

    await employee.save();
    return res.status(201).json({ message: "Employee created successfully.", employee });
  } catch (error) {
    console.error("Create employee error:", error);
    return res.status(500).json({ error: "Failed to create employee: " + error.message });
  }
});

// PUT /api/employees/:id (Update Employee - Admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    const {
      employeeId,
      name,
      email,
      phone,
      address,
      department,
      designation,
      joiningDate,
      employmentType,
      dailyWage,
      monthlySalary,
      notes,
      userId,
    } = req.body;

    if (employeeId && employeeId.trim() !== employee.employeeId) {
      const existing = await Employee.findOne({ employeeId: employeeId.trim(), _id: { $ne: employee._id } });
      if (existing) {
        return res.status(400).json({ error: "Employee ID already taken." });
      }
      employee.employeeId = employeeId.trim();
    }

    if (name) {
      employee.name = name.trim();
      employee.Name = name.trim();
    }
    if (email !== undefined) {
      employee.email = email ? email.trim() : "";
      employee.Email = email ? email.trim() : "";
    }
    if (phone !== undefined) {
      employee.phone = phone ? phone.trim() : "";
      employee.Number = phone && !isNaN(phone) ? Number(phone) : undefined;
    }
    if (address !== undefined) employee.address = address.trim();
    if (department !== undefined) employee.department = department.trim();
    if (designation !== undefined) employee.designation = designation.trim();
    if (joiningDate) employee.joiningDate = new Date(joiningDate);
    if (employmentType) employee.employmentType = employmentType;
    if (dailyWage !== undefined) employee.dailyWage = Math.round(Number(dailyWage) * 100) / 100;
    if (monthlySalary !== undefined) employee.monthlySalary = Math.round(Number(monthlySalary) * 100) / 100;
    if (notes !== undefined) employee.notes = notes.trim();
    if (userId !== undefined) employee.user = userId || null;

    await employee.save();
    return res.json({ message: "Employee updated successfully.", employee });
  } catch (error) {
    console.error("Update employee error:", error);
    return res.status(500).json({ error: "Failed to update employee." });
  }
});

// PATCH /api/employees/:id/deactivate (Soft-deactivate employee - Admin only)
router.patch("/:id/deactivate", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    const { reason } = req.body;
    employee.isActive = false;
    employee.deactivationReason = reason ? reason.trim() : "Deactivated by admin";
    employee.deactivationDate = new Date();

    await employee.save();
    return res.json({ message: "Employee deactivated successfully.", employee });
  } catch (error) {
    return res.status(500).json({ error: "Failed to deactivate employee." });
  }
});

// PATCH /api/employees/:id/reactivate (Reactivate employee - Admin only)
router.patch("/:id/reactivate", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    employee.isActive = true;
    employee.deactivationReason = undefined;
    employee.deactivationDate = undefined;

    await employee.save();
    return res.json({ message: "Employee reactivated successfully.", employee });
  } catch (error) {
    return res.status(500).json({ error: "Failed to reactivate employee." });
  }
});

module.exports = router;
