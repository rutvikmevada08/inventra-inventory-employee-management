const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Advance = require('../models/Advance');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertId } = require('../utils/http');
const { round2 } = require('../utils/money');

function getMonthRange(monthStr) {
  const [yearStr, monthPart] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthPart, 10) - 1;
  const start = new Date(Date.UTC(year, m, 1));
  const end = new Date(Date.UTC(year, m + 1, 1));
  return { start, end };
}

exports.list = asyncHandler(async (req, res) => {
  const { month, employeeId, status } = req.query;
  const filter = {};

  if (month) filter.month = month;
  if (employeeId) filter.employee = assertId(employeeId, 'employee');
  if (status) filter.status = status;

  const payrolls = await Payroll.find(filter)
    .populate('employee', 'name employeeId department dailyWage employmentType')
    .populate('finalizedBy', 'name email')
    .sort({ month: -1, 'employee.name': 1 });

  res.status(200).json({ success: true, payrolls, data: payrolls });
});

exports.get = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(assertId(req.params.id, 'payroll'))
    .populate('employee')
    .populate('finalizedBy', 'name email');

  if (!payroll) throw new ApiError(404, 'Payroll record not found');

  const [payments, advances] = await Promise.all([
    Payment.find({ payroll: payroll._id }).populate('createdBy', 'name email').sort({ paymentDate: -1 }),
    Advance.find({ employee: payroll.employee._id, payrollMonth: payroll.month }),
  ]);

  res.status(200).json({ success: true, payroll, payments, advances, data: { payroll, payments, advances } });
});

exports.generate = asyncHandler(async (req, res) => {
  const { month, employeeId } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new ApiError(400, "A valid month in 'YYYY-MM' format is required.");
  }

  const { start, end } = getMonthRange(month);

  let employees = [];
  if (employeeId) {
    const emp = await Employee.findById(assertId(employeeId, 'employee'));
    if (!emp) throw new ApiError(404, 'Employee not found');
    employees = [emp];
  } else {
    employees = await Employee.find({ isActive: { $ne: false } });
  }

  const generated = [];
  const skippedFinalized = [];

  for (const emp of employees) {
    let existing = await Payroll.findOne({ employee: emp._id, month });

    if (existing && existing.status !== 'Draft') {
      skippedFinalized.push({ employee: emp.name, status: existing.status });
      continue;
    }

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
      if (att.status === 'Present') {
        presentDays += 1;
        totalEligibleDays += 1.0;
      } else if (att.status === 'Half Day') {
        halfDays += 1;
        totalEligibleDays += 0.5;
      } else if (att.status === 'Absent') {
        absentDays += 1;
      } else if (att.status === 'Leave') {
        leaveDays += 1;
      }
    });

    const dailyWage = emp.dailyWage || 0;
    const grossAmount = round2(totalEligibleDays * dailyWage);

    const advancesList = await Advance.find({
      employee: emp._id,
      payrollMonth: month,
      status: { $ne: 'Cancelled' },
    });

    const totalAdvances = round2(advancesList.reduce((sum, a) => sum + a.amount, 0));
    const otherDeductions = existing ? existing.otherDeductions : 0;
    const netPayable = Math.max(0, round2(grossAmount - totalAdvances - otherDeductions));

    if (existing) {
      existing.presentDays = presentDays;
      existing.halfDays = halfDays;
      existing.absentDays = absentDays;
      existing.leaveDays = leaveDays;
      existing.totalEligibleDays = totalEligibleDays;
      existing.dailyWage = dailyWage;
      existing.grossAmount = grossAmount;
      existing.advances = totalAdvances;
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
        advances: totalAdvances,
        otherDeductions,
        netPayable,
        paidAmount: 0,
        status: 'Draft',
      });
      await newPayroll.save();
      generated.push(newPayroll);
    }
  }

  res.status(200).json({
    success: true,
    message: `Payroll processed: ${generated.length} created/updated.`,
    generatedCount: generated.length,
    skippedFinalized,
    month,
    data: generated,
  });
});

exports.finalize = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(assertId(req.params.id, 'payroll'));
  if (!payroll) throw new ApiError(404, 'Payroll record not found');

  if (payroll.status !== 'Draft') {
    throw new ApiError(400, `Payroll cannot be finalized because current status is ${payroll.status}.`);
  }

  payroll.status = payroll.paidAmount > 0 ? (payroll.paidAmount >= payroll.netPayable ? 'Paid' : 'Partially Paid') : 'Finalized';
  payroll.finalizedAt = new Date();
  payroll.finalizedBy = req.user._id;
  await payroll.save();

  await Advance.updateMany(
    { employee: payroll.employee, payrollMonth: payroll.month, status: 'Pending' },
    { $set: { status: 'Deducted' } }
  );

  res.status(200).json({ success: true, message: 'Payroll finalized and locked successfully.', payroll, data: payroll });
});

exports.unfinalize = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(assertId(req.params.id, 'payroll'));
  if (!payroll) throw new ApiError(404, 'Payroll record not found');

  if (payroll.paidAmount > 0) {
    throw new ApiError(400, 'Cannot unlock payroll with recorded payments. Please void payments first.');
  }

  payroll.status = 'Draft';
  payroll.finalizedAt = undefined;
  payroll.finalizedBy = undefined;
  await payroll.save();

  await Advance.updateMany(
    { employee: payroll.employee, payrollMonth: payroll.month, status: 'Deducted' },
    { $set: { status: 'Pending' } }
  );

  res.status(200).json({ success: true, message: 'Payroll unlocked and reverted to Draft.', payroll, data: payroll });
});
