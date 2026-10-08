const express = require("express");
const router = express.Router();
const Advance = require("../../models/Advance");
const Employee = require("../../models/employees");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// GET /api/advances (List advances, filter by employee, status, month)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { employeeId, month, status } = req.query;
    const filter = {};

    if (employeeId) {
      filter.employee = employeeId;
    }

    if (status) {
      filter.status = status;
    }

    if (month) {
      // Filter by date within month or payrollMonth
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const start = new Date(Date.UTC(year, m, 1));
      const end = new Date(Date.UTC(year, m + 1, 1));
      filter.$or = [
        { payrollMonth: month },
        { date: { $gte: start, $lt: end } },
      ];
    }

    const advances = await Advance.find(filter)
      .populate("employee", "name employeeId department dailyWage")
      .populate("createdBy", "name email")
      .sort({ date: -1, createdAt: -1 });

    const totalAmount = advances.reduce(
      (sum, adv) => sum + (adv.status !== "Cancelled" ? adv.amount : 0),
      0
    );

    return res.json({
      advances,
      totalAmount: Math.round(totalAmount * 100) / 100,
    });
  } catch (error) {
    console.error("Fetch advances error:", error);
    return res.status(500).json({ error: "Failed to fetch advances." });
  }
});

// POST /api/advances (Create advance - Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { employeeId, amount, date, reason, payrollMonth, reference } = req.body;

    if (!employeeId || !amount) {
      return res.status(400).json({ error: "Employee and amount are required." });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Advance amount must be a positive number." });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    const advanceDate = date ? new Date(date) : new Date();

    // Determine payrollMonth if not supplied
    let pMonth = payrollMonth;
    if (!pMonth) {
      const year = advanceDate.getFullYear();
      const month = String(advanceDate.getMonth() + 1).padStart(2, "0");
      pMonth = `${year}-${month}`;
    }

    const advance = new Advance({
      employee: employeeId,
      amount: Math.round(parsedAmount * 100) / 100,
      date: advanceDate,
      reason: reason ? reason.trim() : "",
      payrollMonth: pMonth,
      reference: reference ? reference.trim() : `ADV-${Date.now().toString().slice(-6)}`,
      status: "Pending",
      createdBy: req.user._id,
    });

    await advance.save();
    return res.status(201).json({ message: "Advance recorded successfully.", advance });
  } catch (error) {
    console.error("Record advance error:", error);
    return res.status(500).json({ error: "Failed to record advance." });
  }
});

module.exports = router;
