const express = require("express");
const router = express.Router();
const Payroll = require("../../models/Payroll");
const Employee = require("../../models/employees");
const Attendance = require("../../models/Attendance");
const Advance = require("../../models/Advance");
const Payment = require("../../models/Payment");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// Helper to get month boundaries in UTC
function getMonthRange(monthStr) {
  const [yearStr, monthPart] = monthStr.split("-");
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthPart, 10) - 1;
  const start = new Date(Date.UTC(year, m, 1));
  const end = new Date(Date.UTC(year, m + 1, 1));
  return { start, end };
}

// GET /api/payroll (List & Filter)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, employeeId, status } = req.query;
    const filter = {};

    if (month) filter.month = month;
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;

    const payrolls = await Payroll.find(filter)
      .populate("employee", "name employeeId department dailyWage employmentType")
      .populate("finalizedBy", "name email")
      .sort({ month: -1, "employee.name": 1 });

    return res.json({ payrolls });
  } catch (error) {
    console.error("Fetch payroll error:", error);
    return res.status(500).json({ error: "Failed to fetch payroll records." });
  }
});

// GET /api/payroll/:id (Single payroll detail with payments)
router.get("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate("employee")
      .populate("finalizedBy", "name email");

    if (!payroll) {
      return res.status(404).json({ error: "Payroll record not found." });
    }

    const payments = await Payment.find({ payroll: payroll._id })
      .populate("createdBy", "name email")
      .sort({ paymentDate: -1 });

    const advances = await Advance.find({
      employee: payroll.employee._id,
      payrollMonth: payroll.month,
    });

    return res.json({ payroll, payments, advances });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch payroll detail." });
  }
});

// POST /api/payroll/generate (Generate or refresh Draft payroll for a month)
router.post("/generate", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, employeeId } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "A valid month in 'YYYY-MM' format is required." });
    }

    const { start, end } = getMonthRange(month);

    // Employees to process
    let employees = [];
    if (employeeId) {
      const emp = await Employee.findById(employeeId);
      if (!emp) return res.status(404).json({ error: "Employee not found." });
      employees = [emp];
    } else {
      employees = await Employee.find({ isActive: true });
    }

    const generated = [];
    const skippedFinalized = [];

    for (const emp of employees) {
      // Check existing payroll
      let existing = await Payroll.findOne({ employee: emp._id, month });

      // If already finalized or paid, do not silently overwrite!
      if (existing && existing.status !== "Draft") {
        skippedFinalized.push({ employee: emp.name, status: existing.status });
        continue;
      }

      // Calculate attendance
      const attendances = await Attendance.find({
        employee: emp._id,
        date: { $gte: start, $lt: end },
      });

      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let totalEligibleDays = 0;

      attendances.forEach((att) => {
        if (att.status === "Present") {
          presentDays += 1;
          totalEligibleDays += 1.0;
        } else if (att.status === "Half Day") {
          halfDays += 1;
          totalEligibleDays += 0.5;
        } else if (att.status === "Absent") {
          absentDays += 1;
        } else if (att.status === "Leave") {
          leaveDays += 1;
        }
      });

      const dailyWage = emp.dailyWage || 0;
      const grossAmount = Math.round(totalEligibleDays * dailyWage * 100) / 100;

      // Calculate advances for this employee in this month
      const advancesList = await Advance.find({
        employee: emp._id,
        payrollMonth: month,
        status: { $ne: "Cancelled" },
      });

      const totalAdvances = advancesList.reduce((sum, a) => sum + a.amount, 0);
      const roundedAdvances = Math.round(totalAdvances * 100) / 100;

      const otherDeductions = existing ? existing.otherDeductions : 0;
      const netPayable = Math.max(0, Math.round((grossAmount - roundedAdvances - otherDeductions) * 100) / 100);

      if (existing) {
        existing.presentDays = presentDays;
        existing.halfDays = halfDays;
        existing.absentDays = absentDays;
        existing.leaveDays = leaveDays;
        existing.totalEligibleDays = totalEligibleDays;
        existing.dailyWage = dailyWage;
        existing.grossAmount = grossAmount;
        existing.advances = roundedAdvances;
        existing.otherDeductions = otherDeductions;
        existing.netPayable = netPayable;
        await existing.save();
        generated.push(existing);
      } else {
        const newPayroll = new Payroll({
          employee: emp._id,
          month,
          presentDays,
          halfDays,
          absentDays,
          leaveDays,
          totalEligibleDays,
          dailyWage,
          grossAmount,
          advances: roundedAdvances,
          otherDeductions,
          netPayable,
          paidAmount: 0,
          status: "Draft",
        });
        await newPayroll.save();
        generated.push(newPayroll);
      }
    }

    return res.json({
      message: `Payroll processed: ${generated.length} created/updated.`,
      generatedCount: generated.length,
      skippedFinalized,
      month,
    });
  } catch (error) {
    console.error("Generate payroll error:", error);
    return res.status(500).json({ error: "Failed to generate payroll." });
  }
});

// POST /api/payroll/:id/finalize (Lock payroll)
router.post("/:id/finalize", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ error: "Payroll record not found." });
    }

    if (payroll.status !== "Draft") {
      return res.status(400).json({ error: `Payroll cannot be finalized because current status is ${payroll.status}.` });
    }

    payroll.status = payroll.paidAmount > 0 ? (payroll.paidAmount >= payroll.netPayable ? "Paid" : "Partially Paid") : "Finalized";
    payroll.finalizedAt = new Date();
    payroll.finalizedBy = req.user._id;
    await payroll.save();

    // Mark eligible advances as Deducted
    await Advance.updateMany(
      { employee: payroll.employee, payrollMonth: payroll.month, status: "Pending" },
      { $set: { status: "Deducted" } }
    );

    return res.json({ message: "Payroll finalized and locked successfully.", payroll });
  } catch (error) {
    console.error("Finalize payroll error:", error);
    return res.status(500).json({ error: "Failed to finalize payroll." });
  }
});

// POST /api/payroll/:id/unfinalize (Unlock back to draft - explicit correction process)
router.post("/:id/unfinalize", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ error: "Payroll record not found." });
    }

    // Guard: Cannot unfinalize if any completed payments exist!
    const payments = await Payment.find({ payroll: payroll._id, status: "Completed" });
    if (payments.length > 0) {
      return res.status(400).json({
        error: "Cannot unfinalize payroll with completed payments. Void existing payments first.",
      });
    }

    payroll.status = "Draft";
    payroll.finalizedAt = null;
    payroll.finalizedBy = null;
    await payroll.save();

    // Revert advances to Pending
    await Advance.updateMany(
      { employee: payroll.employee, payrollMonth: payroll.month, status: "Deducted" },
      { $set: { status: "Pending" } }
    );

    return res.json({ message: "Payroll unlocked to Draft for corrections.", payroll });
  } catch (error) {
    console.error("Unfinalize payroll error:", error);
    return res.status(500).json({ error: "Failed to unlock payroll." });
  }
});

module.exports = router;
