const Expense = require('../models/Expense');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertId } = require('../utils/http');
const { round2 } = require('../utils/money');

exports.list = asyncHandler(async (req, res) => {
  const { category, status, vendorId, startDate, endDate } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (status) filter.status = status;
  if (vendorId) filter.vendor = assertId(vendorId, 'vendor');

  if (startDate && endDate) {
    filter.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const expenses = await Expense.find(filter)
    .populate('vendor')
    .populate('createdBy', 'name email')
    .sort({ date: -1 });

  const totalAmount = round2(expenses.reduce((sum, e) => sum + (e.amount || 0), 0));

  res.status(200).json({
    success: true,
    expenses,
    data: expenses,
    totalAmount,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const { category, amount, date, description, vendorId, personName, reference, status, notes } = req.body;
  if (!category || amount === undefined || !description) {
    throw new ApiError(400, 'Category, amount, and description are required.');
  }

  const amountNum = round2(amount);
  if (amountNum <= 0) throw new ApiError(400, 'Amount must be a positive number.');

  const expense = new Expense({
    category: String(category).trim(),
    amount: amountNum,
    date: date ? new Date(date) : new Date(),
    description: String(description).trim(),
    vendor: vendorId ? assertId(vendorId, 'vendor') : undefined,
    personName: personName ? String(personName).trim() : undefined,
    reference: reference ? String(reference).trim() : undefined,
    receiptFile: req.file?.filename,
    status: status === 'Pending' ? 'Pending' : 'Paid',
    notes: notes ? String(notes).trim() : '',
    createdBy: req.user._id,
  });

  await expense.save();
  await expense.populate('vendor');

  res.status(201).json({
    success: true,
    message: 'Expense recorded successfully.',
    expense,
    data: expense,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(assertId(req.params.id, 'expense'));
  if (!expense) throw new ApiError(404, 'Expense not found.');

  const { category, amount, date, description, vendorId, personName, reference, status, notes } = req.body;

  if (category) expense.category = String(category).trim();
  if (amount !== undefined) {
    const amountNum = round2(amount);
    if (amountNum <= 0) throw new ApiError(400, 'Amount must be a positive number.');
    expense.amount = amountNum;
  }
  if (date) expense.date = new Date(date);
  if (description) expense.description = String(description).trim();
  if (vendorId !== undefined) expense.vendor = vendorId ? assertId(vendorId, 'vendor') : undefined;
  if (personName !== undefined) expense.personName = String(personName).trim();
  if (reference !== undefined) expense.reference = String(reference).trim();
  if (status) expense.status = status;
  if (notes !== undefined) expense.notes = String(notes).trim();
  if (req.file) expense.receiptFile = req.file.filename;

  await expense.save();
  res.status(200).json({ success: true, message: 'Expense updated successfully.', expense, data: expense });
});

exports.delete = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(assertId(req.params.id, 'expense'));
  if (!expense) throw new ApiError(404, 'Expense not found.');

  await Expense.deleteOne({ _id: expense._id });
  res.status(200).json({ success: true, message: 'Expense deleted successfully.' });
});
