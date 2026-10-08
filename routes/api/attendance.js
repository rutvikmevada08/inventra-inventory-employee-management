const express = require("express");
const router = express.Router();
const Attendance = require("../../models/Attendance");
const Employee = require("../../models/employees");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// Helper to normalize date to start of day (midnight UTC)
function normalizeDate(d) {
  const dt = new Date(d);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

// GET /api/attendance (List & Filter by date, employee, month)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { date, month, employeeId, startDate, endDate } = req.query;
    const filter = {};

    if (employeeId) {
      filter.employee = employeeId;
    }

    if (date) {
      const targetDate = normalizeDate(date);
      const nextDay = new Date(targetDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      filter.date = { $gte: targetDate, $lt: nextDay };
    } else if (startDate && endDate) {
      const start = normalizeDate(startDate);
      const end = normalizeDate(endDate);
      end.setUTCDate(end.getUTCDate() + 1);
      filter.date = { $gte: start, $lt: end };
    } else if (month) {
      // month is "YYYY-MM"
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const start = new Date(Date.UTC(year, m, 1));
      const end = new Date(Date.UTC(year, m + 1, 1));
      filter.date = { $gte: start, $lt: end };
    }

    const records = await Attendance.find(filter)
      .populate("employee", "name employeeId department dailyWage isActive")
      .populate("createdBy", "name email")
      .sort({ date: -1, "employee.name": 1 });

    return res.json({ attendance: records });
  } catch (error) {
    console.error("Fetch attendance error:", error);
    return res.status(500).json({ error: "Failed to fetch attendance records." });
  }
});

// GET /api/attendance/daily-matrix (Get attendance for all active employees on a specific date)
router.get("/daily-status", authenticateToken, async (req, res) => {
  try {
    const queryDate = req.query.date ? normalizeDate(req.query.date) : normalizeDate(new Date());
    const nextDay = new Date(queryDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const activeEmployees = await Employee.find({ isActive: true }).sort({ name: 1, Name: 1 });
    const existingRecords = await Attendance.find({
      date: { $gte: queryDate, $lt: nextDay },
    });

    const attendanceMap = {};
    existingRecords.forEach((rec) => {
      attendanceMap[rec.employee.toString()] = rec;
    });

    const list = activeEmployees.map((emp) => ({
      employee: emp,
      attendance: attendanceMap[emp._id.toString()] || null,
    }));

    return res.json({ date: queryDate, employees: list });
  } catch (error) {
    console.error("Daily status error:", error);
    return res.status(500).json({ error: "Failed to fetch daily attendance status." });
  }
});

// GET /api/attendance/wages (Daily wages calculation breakdown)
router.get("/wages", authenticateToken, async (req, res) => {
  try {
    const { month, employeeId, startDate, endDate } = req.query;
    const filter = {};

    if (employeeId) {
      filter.employee = employeeId;
    }

    if (month) {
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const start = new Date(Date.UTC(year, m, 1));
      const end = new Date(Date.UTC(year, m + 1, 1));
      filter.date = { $gte: start, $lt: end };
    } else if (startDate && endDate) {
      const start = normalizeDate(startDate);
      const end = normalizeDate(endDate);
      end.setUTCDate(end.getUTCDate() + 1);
      filter.date = { $gte: start, $lt: end };
    }

    const attendanceRecords = await Attendance.find(filter).populate("employee");

    // Group by employee
    const employeeMap = {};
    attendanceRecords.forEach((record) => {
      if (!record.employee) return;
      const empId = record.employee._id.toString();
      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employee: record.employee,
          presentDays: 0,
          halfDays: 0,
          absentDays: 0,
          leaveDays: 0,
          eligibleDays: 0,
          dailyWage: record.employee.dailyWage || 0,
          grossWage: 0,
        };
      }

      if (record.status === "Present") {
        employeeMap[empId].presentDays += 1;
        employeeMap[empId].eligibleDays += 1.0;
      } else if (record.status === "Half Day") {
        employeeMap[empId].halfDays += 1;
        employeeMap[empId].eligibleDays += 0.5;
      } else if (record.status === "Absent") {
        employeeMap[empId].absentDays += 1;
      } else if (record.status === "Leave") {
        employeeMap[empId].leaveDays += 1;
      }
    });

    // Calculate gross wages
    const result = Object.values(employeeMap).map((item) => {
      item.grossWage = Math.round(item.eligibleDays * item.dailyWage * 100) / 100;
      return item;
    });

    return res.json({ wages: result });
  } catch (error) {
    console.error("Wages calculation error:", error);
    return res.status(500).json({ error: "Failed to calculate daily wages." });
  }
});

// POST /api/attendance (Mark or update attendance - Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { employeeId, date, status, note } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({ error: "Employee, date, and status are required." });
    }

    const validStatuses = ["Present", "Half Day", "Absent", "Leave"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid attendance status." });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    const normalized = normalizeDate(date);

    // Upsert or check duplicate
    let record = await Attendance.findOne({ employee: employeeId, date: normalized });
    if (record) {
      record.status = status;
      record.note = note ? note.trim() : record.note;
      record.createdBy = req.user._id;
      await record.save();
      return res.json({ message: "Attendance updated successfully.", record });
    }

    record = new Attendance({
      employee: employeeId,
      date: normalized,
      status,
      note: note ? note.trim() : "",
      createdBy: req.user._id,
    });

    await record.save();
    return res.status(201).json({ message: "Attendance recorded successfully.", record });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Attendance already recorded for this employee on this date." });
    }
    console.error("Save attendance error:", error);
    return res.status(500).json({ error: "Failed to save attendance." });
  }
});

// POST /api/attendance/bulk (Bulk mark attendance for date - Admin only)
router.post("/bulk", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ error: "Date and records array are required." });
    }

    const normalized = normalizeDate(date);
    const results = [];

    for (const item of records) {
      if (!item.employeeId || !item.status) continue;
      const updated = await Attendance.findOneAndUpdate(
        { employee: item.employeeId, date: normalized },
        {
          $set: {
            status: item.status,
            eligibleDays: item.status === "Present" ? 1.0 : item.status === "Half Day" ? 0.5 : 0.0,
            note: item.note || "",
            createdBy: req.user._id,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      results.push(updated);
    }

    return res.json({ message: "Bulk attendance updated successfully.", count: results.length });
  } catch (error) {
    console.error("Bulk attendance error:", error);
    return res.status(500).json({ error: "Failed to save bulk attendance." });
  }
});

module.exports = router;
