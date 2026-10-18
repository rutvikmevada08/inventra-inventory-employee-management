const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertId } = require('../utils/http');
const { round2 } = require('../utils/money');

function normalizeDate(d) {
  const dt = new Date(d);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

exports.list = asyncHandler(async (req, res) => {
  const { date, month, employeeId, startDate, endDate } = req.query;
  const filter = {};

  if (employeeId) filter.employee = assertId(employeeId, 'employee');

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
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1;
    const start = new Date(Date.UTC(year, m, 1));
    const end = new Date(Date.UTC(year, m + 1, 1));
    filter.date = { $gte: start, $lt: end };
  }

  const records = await Attendance.find(filter)
    .populate('employee', 'name employeeId department dailyWage isActive')
    .populate('createdBy', 'name email')
    .sort({ date: -1 });

  res.status(200).json({ success: true, attendance: records, data: records });
});

exports.dailyStatus = asyncHandler(async (req, res) => {
  const queryDate = req.query.date ? normalizeDate(req.query.date) : normalizeDate(new Date());
  const nextDay = new Date(queryDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const activeEmployees = await Employee.find({ isActive: { $ne: false } }).sort({ name: 1 });
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

  res.status(200).json({ success: true, date: queryDate, employees: list, data: list });
});

exports.wages = asyncHandler(async (req, res) => {
  const { month, employeeId, startDate, endDate } = req.query;
  const filter = {};

  if (employeeId) filter.employee = assertId(employeeId, 'employee');

  if (month) {
    const [yearStr, monthStr] = month.split('-');
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

  const attendanceRecords = await Attendance.find(filter).populate('employee');

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

    if (record.status === 'Present') {
      employeeMap[empId].presentDays += 1;
      employeeMap[empId].eligibleDays += 1.0;
    } else if (record.status === 'Half Day') {
      employeeMap[empId].halfDays += 1;
      employeeMap[empId].eligibleDays += 0.5;
    } else if (record.status === 'Absent') {
      employeeMap[empId].absentDays += 1;
    } else if (record.status === 'Leave') {
      employeeMap[empId].leaveDays += 1;
    }
  });

  const result = Object.values(employeeMap).map((item) => {
    item.grossWage = round2(item.eligibleDays * item.dailyWage);
    return item;
  });

  res.status(200).json({ success: true, wages: result, data: result });
});

exports.record = asyncHandler(async (req, res) => {
  const { employeeId, date, status, note } = req.body;
  if (!employeeId || !date || !status) throw new ApiError(400, 'Employee, date, and status are required');

  const validStatuses = ['Present', 'Half Day', 'Absent', 'Leave'];
  if (!validStatuses.includes(status)) throw new ApiError(400, 'Invalid attendance status');

  const employee = await Employee.findById(assertId(employeeId, 'employee'));
  if (!employee) throw new ApiError(404, 'Employee not found');

  const normalized = normalizeDate(date);

  let record = await Attendance.findOne({ employee: employee._id, date: normalized });
  if (record) {
    record.status = status;
    record.note = note ? String(note).trim() : record.note;
    record.createdBy = req.user._id;
    await record.save();
    return res.status(200).json({ success: true, message: 'Attendance updated successfully.', record, data: record });
  }

  record = new Attendance({
    employee: employee._id,
    date: normalized,
    status,
    note: note ? String(note).trim() : '',
    createdBy: req.user._id,
  });

  await record.save();
  res.status(201).json({ success: true, message: 'Attendance recorded successfully.', record, data: record });
});

exports.bulk = asyncHandler(async (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records)) throw new ApiError(400, 'Date and records array are required');

  const normalized = normalizeDate(date);
  const results = [];

  for (const item of records) {
    if (!item.employeeId || !item.status) continue;
    const updated = await Attendance.findOneAndUpdate(
      { employee: item.employeeId, date: normalized },
      {
        $set: {
          status: item.status,
          eligibleDays: item.status === 'Present' ? 1.0 : item.status === 'Half Day' ? 0.5 : 0.0,
          note: item.note || '',
          createdBy: req.user._id,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    results.push(updated);
  }

  res.status(200).json({ success: true, message: 'Bulk attendance updated successfully.', count: results.length, data: results });
});
