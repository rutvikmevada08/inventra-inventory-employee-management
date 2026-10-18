const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const Advance = require('../models/Advance');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paging, pageMeta, escapeRegex, assertId, pick } = require('../utils/http');
const { round2 } = require('../utils/money');

exports.list = asyncHandler(async (req, res) => {
  const { search, status, department, employmentType } = req.query;
  const filter = {};

  if (status === 'active') {
    filter.isActive = { $ne: false };
  } else if (status === 'inactive') {
    filter.isActive = false;
  }

  if (department) filter.department = department;
  if (employmentType) filter.employmentType = employmentType;

  if (search) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [
      { name: rx },
      { employeeId: rx },
      { email: rx },
      { phone: rx },
      { department: rx },
      { designation: rx },
    ];
  }

  const p = paging(req.query, 100);
  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate('user', 'name email role')
      .sort({ isActive: -1, name: 1 })
      .skip(p.skip)
      .limit(p.limit),
    Employee.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    employees,
    data: employees,
    meta: pageMeta(p, total),
  });
});

exports.get = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(assertId(req.params.id, 'employee')).populate('user', 'name email role');
  if (!employee) throw new ApiError(404, 'Employee not found');
  res.status(200).json({ success: true, employee, data: employee });
});

exports.financialSummary = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(assertId(req.params.id, 'employee'));
  if (!employee) throw new ApiError(404, 'Employee not found');

  const [attendances, advances, payrolls, payments] = await Promise.all([
    Attendance.find({ employee: employee._id }).sort({ date: -1 }).limit(100),
    Advance.find({ employee: employee._id }).sort({ date: -1 }),
    Payroll.find({ employee: employee._id }).sort({ month: -1 }),
    Payment.find({ employee: employee._id }).sort({ paymentDate: -1 }),
  ]);

  const presentCount = attendances.filter((a) => a.status === 'Present').length;
  const halfDayCount = attendances.filter((a) => a.status === 'Half Day').length;
  const absentCount = attendances.filter((a) => a.status === 'Absent').length;
  const leaveCount = attendances.filter((a) => a.status === 'Leave').length;
  const totalEligibleDays = presentCount * 1.0 + halfDayCount * 0.5;

  const totalAdvances = round2(advances.reduce((sum, a) => sum + (a.status !== 'Cancelled' ? a.amount : 0), 0));
  const totalPaid = round2(payments.reduce((sum, p) => sum + (p.status === 'Completed' ? p.amount : 0), 0));
  const totalGrossEarned = round2(payrolls.reduce((sum, p) => sum + (p.grossAmount || 0), 0));
  const totalNetPayable = round2(payrolls.reduce((sum, p) => sum + (p.status !== 'Draft' ? p.netPayable : 0), 0));
  const outstandingPayable = Math.max(0, round2(totalNetPayable - totalPaid));

  const summary = {
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
      totalAdvances,
      records: advances,
    },
    payrolls,
    payments: {
      totalPaid,
      records: payments,
    },
    financialStatus: {
      totalGrossEarned,
      totalNetPayable,
      totalPaid,
      outstandingPayable,
    },
    totalGrossEarned,
  };

  res.status(200).json({ success: true, summary, data: summary, ...summary });
});

exports.create = asyncHandler(async (req, res) => {
  const { employeeId, employeeCode, name, email, phone, address, department, designation, joiningDate, employmentType, dailyWage, monthlySalary, notes, userId } = req.body;
  if (!name || !name.trim()) throw new ApiError(400, 'Employee full name is required');

  const empCode = (employeeCode || employeeId || '').trim();
  if (empCode) {
    const existing = await Employee.findOne({ employeeId: empCode });
    if (existing) throw new ApiError(400, 'Employee ID already exists');
  }

  const employee = new Employee({
    employeeId: empCode ? empCode : undefined,
    name: name.trim(),
    email: email ? email.trim() : undefined,
    phone: phone ? phone.trim() : undefined,
    address: address ? address.trim() : '',
    department: department ? department.trim() : 'Operations',
    designation: designation ? designation.trim() : 'Worker',
    joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
    employmentType: employmentType || 'Daily Wage',
    dailyWage: dailyWage ? round2(dailyWage) : 0,
    monthlySalary: monthlySalary ? round2(monthlySalary) : 0,
    notes: notes ? notes.trim() : '',
    user: userId || undefined,
    isActive: true,
  });

  await employee.save();
  res.status(201).json({ success: true, message: 'Employee created successfully.', employee, data: employee });
});

exports.update = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(assertId(req.params.id, 'employee'));
  if (!employee) throw new ApiError(404, 'Employee not found');

  const { employeeId, name, email, phone, address, department, designation, joiningDate, employmentType, dailyWage, monthlySalary, notes, userId } = req.body;

  if (employeeId && employeeId.trim() !== employee.employeeId) {
    const existing = await Employee.findOne({ employeeId: employeeId.trim(), _id: { $ne: employee._id } });
    if (existing) throw new ApiError(400, 'Employee ID already taken');
    employee.employeeId = employeeId.trim();
  }

  if (name) employee.name = name.trim();
  if (email !== undefined) employee.email = email ? email.trim() : '';
  if (phone !== undefined) employee.phone = phone ? phone.trim() : '';
  if (address !== undefined) employee.address = address.trim();
  if (department !== undefined) employee.department = department.trim();
  if (designation !== undefined) employee.designation = designation.trim();
  if (joiningDate) employee.joiningDate = new Date(joiningDate);
  if (employmentType) employee.employmentType = employmentType;
  if (dailyWage !== undefined) employee.dailyWage = round2(dailyWage);
  if (monthlySalary !== undefined) employee.monthlySalary = round2(monthlySalary);
  if (notes !== undefined) employee.notes = notes.trim();
  if (userId !== undefined) employee.user = userId || null;

  await employee.save();
  res.status(200).json({ success: true, message: 'Employee updated successfully.', employee, data: employee });
});

exports.deactivate = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(assertId(req.params.id, 'employee'));
  if (!employee) throw new ApiError(404, 'Employee not found');

  employee.isActive = false;
  employee.deactivationReason = req.body.reason ? String(req.body.reason).trim() : 'Deactivated by admin';
  employee.deactivationDate = new Date();

  await employee.save();
  res.status(200).json({ success: true, message: 'Employee deactivated successfully.', employee, data: employee });
});

exports.reactivate = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(assertId(req.params.id, 'employee'));
  if (!employee) throw new ApiError(404, 'Employee not found');

  employee.isActive = true;
  employee.deactivationReason = undefined;
  employee.deactivationDate = undefined;

  await employee.save();
  res.status(200).json({ success: true, message: 'Employee reactivated successfully.', employee, data: employee });
});
