const express = require("express");
const router = express.Router();
const Employee = require("../../models/employees");
const Attendance = require("../../models/Attendance");
const Payroll = require("../../models/Payroll");
const Advance = require("../../models/Advance");
const Payment = require("../../models/Payment");
const Lot = require("../../models/lots");
const ItemRequest = require("../../models/item_req");
const Reimbursement = require("../../models/reimbursement");
const Fuel = require("../../models/fuel");
const InventoryLedger = require("../../models/InventoryLedger");
const { authenticateToken } = require("../../middleware/auth");

router.get("/", authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}`;
    const startOfMonth = new Date(Date.UTC(currentYear, today.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(currentYear, today.getMonth() + 1, 1));

    // Parallel metrics collection
    const [
      totalActiveEmployees,
      todayAttendances,
      monthPayrolls,
      monthAdvances,
      monthPayments,
      pendingItemRequests,
      pendingReimbursements,
      unreceivedLots,
      monthFuel,
      stockLedgerSummary,
    ] = await Promise.all([
      Employee.countDocuments({ isActive: true }),
      Attendance.find({ date: { $gte: startOfToday, $lt: endOfToday } }),
      Payroll.find({ month: currentMonthStr }),
      Advance.find({
        $or: [{ payrollMonth: currentMonthStr }, { date: { $gte: startOfMonth, $lt: endOfMonth } }],
        status: { $ne: "Cancelled" },
      }),
      Payment.find({
        paymentDate: { $gte: startOfMonth, $lt: endOfMonth },
        status: "Completed",
      }),
      ItemRequest.countDocuments({ Status: "Requested" }),
      Reimbursement.countDocuments({ Status: { $in: ["Requested", "Pending"] } }),
      Lot.countDocuments({ Received: false }),
      Fuel.find({ Date: { $gte: startOfMonth, $lt: endOfMonth } }),
      InventoryLedger.aggregate([
        {
          $group: {
            _id: null,
            totalStockIn: {
              $sum: { $cond: [{ $in: ["$transactionType", ["STOCK_IN", "REVERSAL"]] }, "$quantity", 0] },
            },
            totalStockOut: {
              $sum: { $cond: [{ $eq: ["$transactionType", "STOCK_OUT"] }, "$quantity", 0] },
            },
          },
        },
      ]),
    ]);

    // Attendance breakdown today
    let presentToday = 0;
    let halfDayToday = 0;
    let absentToday = 0;
    let leaveToday = 0;

    todayAttendances.forEach((att) => {
      if (att.status === "Present") presentToday++;
      else if (att.status === "Half Day") halfDayToday++;
      else if (att.status === "Absent") absentToday++;
      else if (att.status === "Leave") leaveToday++;
    });

    // Unmarked attendance today
    const unmarkedToday = Math.max(0, totalActiveEmployees - todayAttendances.length);

    // Financial totals for current month
    const currentMonthGrossPayroll = monthPayrolls.reduce((sum, p) => sum + (p.grossAmount || 0), 0);
    const currentMonthNetPayroll = monthPayrolls.reduce((sum, p) => sum + (p.netPayable || 0), 0);
    const currentMonthAdvances = monthAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
    const currentMonthPaid = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstandingWages = Math.max(0, Math.round((currentMonthNetPayroll - currentMonthPaid) * 100) / 100);

    const currentMonthFuelSpent = monthFuel.reduce((sum, f) => sum + (f.Total || 0), 0);

    const stockSummary = stockLedgerSummary[0] || { totalStockIn: 0, totalStockOut: 0 };
    const netCurrentStock = Math.max(0, stockSummary.totalStockIn - stockSummary.totalStockOut);

    return res.json({
      workforce: {
        totalActiveEmployees,
        attendanceToday: {
          presentToday,
          halfDayToday,
          absentToday,
          leaveToday,
          unmarkedToday,
          totalRecorded: todayAttendances.length,
        },
        financials: {
          currentMonth: currentMonthStr,
          grossPayroll: Math.round(currentMonthGrossPayroll * 100) / 100,
          netPayroll: Math.round(currentMonthNetPayroll * 100) / 100,
          advances: Math.round(currentMonthAdvances * 100) / 100,
          totalPaid: Math.round(currentMonthPaid * 100) / 100,
          outstandingWages,
        },
      },
      operations: {
        pendingItemRequests,
        pendingReimbursements,
        unreceivedLots,
        fuelSpentMonth: Math.round(currentMonthFuelSpent * 100) / 100,
        netCurrentStock,
      },
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return res.status(500).json({ error: "Failed to compile dashboard metrics." });
  }
});

module.exports = router;
