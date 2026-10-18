const Advance = require('../models/Advance');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertId } = require('../utils/http');
const { round2 } = require('../utils/money');

exports.list = asyncHandler(async (req, res) => {
  const { employeeId, month, status } = req.query;
  const filter = {};

  if (employeeId) filter.employee = assertId(employeeId, 'employee');
  if (status) filter.status = status;

  if (month) {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1;
    const start = new Date(Date.UTC(year, m, 1));
    const end = new Date(Date.UTC(year, m + 1, 1));
    filter.$or = [{ payrollMonth: month }, { date: { $gte: start, $lt: end } }];
  }

  const advances = await Advance.find(filter)
    .populate('employee', 'name employeeId department dailyWage')
    .populate('createdBy', 'name email')
    .sort({ date: -1 });

  const totalAmount = round2(advances.reduce((sum, adv) => sum + (adv.status !== 'Cancelled' ? adv.amount : 0), 0));

  res.status(200).json({
    success: true,
    advances,
    data: advances,
    totalAmount,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const { employeeId, amount, date, reason, payrollMonth, reference } = req.body;
  if (!employeeId || amount === undefined) throw new ApiError(400, 'Employee and amount are required');

  const parsedAmount = round2(amount);
  if (parsedAmount <= 0) throw new ApiError(400, 'Advance amount must be greater than zero');

  const employee = await Employee.findById(assertId(employeeId, 'employee'));
  if (!employee) throw new ApiError(404, 'Employee not found');

  const advanceDate = date ? new Date(date) : new Date();
  const defaultMonth = `${advanceDate.getFullYear()}-${String(advanceDate.getMonth() + 1).padStart(2, '0')}`;

  const advance = new Advance({
    employee: employee._id,
    amount: parsedAmount,
    date: advanceDate,
    reason: reason ? String(reason).trim() : '',
    payrollMonth: payrollMonth || defaultMonth,
    reference: reference ? String(reference).trim() : `ADV-${Date.now().toString().slice(-6)}`,
    status: 'Pending',
    createdBy: req.user._id,
  });

  await advance.save();
  await advance.populate('employee', 'name employeeId department');

  res.status(201).json({
    success: true,
    message: 'Advance recorded successfully.',
    advance,
    data: advance,
  });
});

exports.cancel = asyncHandler(async (req, res) => {
  const advance = await Advance.findById(assertId(req.params.id, 'advance'));
  if (!advance) throw new ApiError(404, 'Advance not found');

  if (advance.status === 'Deducted') {
    throw new ApiError(400, 'Cannot cancel an advance that has already been deducted from finalized payroll.');
  }

  advance.status = 'Cancelled';
  await advance.save();

  res.status(200).json({
    success: true,
    message: 'Advance cancelled successfully.',
    advance,
    data: advance,
  });
});
