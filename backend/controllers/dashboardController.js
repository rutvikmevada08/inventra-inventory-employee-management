const ItemType = require('../models/ItemType');
const ItemRequest = require('../models/ItemRequest');
const Reimbursement = require('../models/Reimbursement');
const Lot = require('../models/Lot');
const Vendor = require('../models/Vendor');
const FuelEntry = require('../models/FuelEntry');
const InventoryTransaction = require('../models/InventoryTransaction');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const Expense = require('../models/Expense');
const stock = require('../services/stock');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/http');
const { round2 } = require('../utils/money');
const { sumField } = require('../utils/aggregate');

const active = { isActive: { $ne: false } };

exports.summary = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    const [openItemRequests, openReimbursements] = await Promise.all([
      ItemRequest.countDocuments({ requestedBy: req.user._id, status: 'requested' }),
      Reimbursement.countDocuments({ claimant: req.user._id, status: { $in: ['requested', 'approved'] }, ...active }),
    ]);
    return ok(res, { role: 'staff', openItemRequests, openReimbursements });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const fuelMatch = { ...active, date: { $gte: monthStart } };
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [
    types,
    pendingItemRequests,
    pendingReimbursements,
    vendorCount,
    unpaidLots,
    fuelAmount,
    fuelLitres,
    recent,
    totalActiveEmployees,
    todayAttendance,
    monthlyPayrolls,
    expenseAmount,
  ] = await Promise.all([
    ItemType.find({ ...active, isStockable: { $ne: false } }).lean(),
    ItemRequest.countDocuments({ status: 'requested' }),
    Reimbursement.countDocuments({ status: 'requested', ...active }),
    Vendor.countDocuments(active),
    Lot.find({ ...active, paymentStatus: { $ne: 'paid' } }).select('totalPayable totalPaid').lean(),
    sumField(FuelEntry, fuelMatch, 'total'),
    sumField(FuelEntry, fuelMatch, 'litres'),
    InventoryTransaction.find().populate('itemType', 'name unit').sort({ createdAt: -1 }).limit(8).lean(),
    Employee.countDocuments(active),
    Attendance.find({ date: { $gte: startOfToday, $lte: endOfToday } }).lean(),
    Payroll.find({ month: currentMonthStr }).lean(),
    sumField(Expense, { date: { $gte: monthStart } }, 'amount'),
  ]);

  const bal = await stock.balances(types.map((t) => t._id));
  const lowStock = types
    .map((t) => ({ _id: t._id, name: t.name, unit: t.unit, reorderLevel: t.reorderLevel, balance: bal.get(String(t._id))?.balance || 0 }))
    .filter((t) => t.reorderLevel > 0 && t.balance <= t.reorderLevel);

  let presentToday = 0;
  let halfDayToday = 0;
  let absentToday = 0;
  let leaveToday = 0;
  for (const a of todayAttendance) {
    if (a.status === 'Present') presentToday++;
    else if (a.status === 'Half Day') halfDayToday++;
    else if (a.status === 'Absent') absentToday++;
    else if (a.status === 'Leave') leaveToday++;
  }
  const markedToday = presentToday + halfDayToday + absentToday + leaveToday;
  const unmarkedToday = Math.max(0, totalActiveEmployees - markedToday);

  const grossPayroll = round2(monthlyPayrolls.reduce((s, p) => s + (p.grossAmount || 0), 0));
  const advanceDeductions = round2(monthlyPayrolls.reduce((s, p) => s + (p.advances || 0), 0));
  const netPayroll = round2(monthlyPayrolls.reduce((s, p) => s + (p.netPayable || 0), 0));
  const totalWagesPaid = round2(monthlyPayrolls.reduce((s, p) => s + (p.paidAmount || 0), 0));
  const outstandingWages = round2(Math.max(0, netPayroll - totalWagesPaid));

  ok(res, {
    role: 'admin',
    stockItemCount: types.length,
    lowStockCount: lowStock.length,
    lowStock: lowStock.slice(0, 8),
    pendingItemRequests,
    pendingReimbursements,
    vendorCount,
    outstandingToVendors: round2(unpaidLots.reduce((s, l) => s + (l.totalPayable - l.totalPaid), 0)),
    fuelThisMonth: { amount: round2(fuelAmount), litres: round2(fuelLitres) },
    expensesThisMonth: round2(expenseAmount),
    recentMovements: recent,
    workforce: {
      totalActiveEmployees,
      attendanceToday: {
        present: presentToday,
        halfDay: halfDayToday,
        absent: absentToday,
        leave: leaveToday,
        unmarked: unmarkedToday,
      },
      payrollThisMonth: {
        month: currentMonthStr,
        gross: grossPayroll,
        advances: advanceDeductions,
        net: netPayroll,
        paid: totalWagesPaid,
        outstanding: outstandingWages,
      },
    },
  });
});
