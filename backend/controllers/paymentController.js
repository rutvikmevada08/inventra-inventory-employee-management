const Payment = require('../models/Payment');
const Payroll = require('../models/Payroll');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertId } = require('../utils/http');
const { round2 } = require('../utils/money');

exports.list = asyncHandler(async (req, res) => {
  const { employeeId, payrollId, startDate, endDate, status } = req.query;
  const filter = {};

  if (employeeId) filter.employee = assertId(employeeId, 'employee');
  if (payrollId) filter.payroll = assertId(payrollId, 'payroll');
  if (status) filter.status = status;

  if (startDate && endDate) {
    filter.paymentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const payments = await Payment.find(filter)
    .populate('employee', 'name employeeId department dailyWage')
    .populate('payroll', 'month netPayable paidAmount status')
    .populate('createdBy', 'name email')
    .sort({ paymentDate: -1 });

  const totalPaid = round2(payments.reduce((sum, p) => sum + (p.status === 'Completed' ? p.amount : 0), 0));

  res.status(200).json({ success: true, payments, data: payments, totalPaid });
});

exports.create = asyncHandler(async (req, res) => {
  const { payrollId, amount, paymentDate, paymentMethod, transactionReference, notes } = req.body;
  if (!payrollId || amount === undefined) throw new ApiError(400, 'Payroll reference and amount are required.');

  const cleanAmount = round2(amount);
  if (cleanAmount <= 0) throw new ApiError(400, 'Payment amount must be greater than zero.');

  const payroll = await Payroll.findById(assertId(payrollId, 'payroll'));
  if (!payroll) throw new ApiError(404, 'Payroll record not found.');

  if (payroll.status === 'Draft') {
    throw new ApiError(400, 'Cannot record payment on a Draft payroll. Please finalize the payroll first.');
  }

  const currentPaid = payroll.paidAmount || 0;
  const netPayable = payroll.netPayable || 0;
  const remainingPayable = round2(Math.max(0, netPayable - currentPaid));

  if (cleanAmount > remainingPayable + 0.005) {
    throw new ApiError(
      400,
      `Overpayment rejected: payment amount of ₹${cleanAmount.toFixed(2)} exceeds remaining payable amount of ₹${remainingPayable.toFixed(2)}.`
    );
  }

  const payment = new Payment({
    employee: payroll.employee,
    payroll: payroll._id,
    amount: cleanAmount,
    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    paymentMethod: paymentMethod || 'Bank Transfer',
    transactionReference: transactionReference ? String(transactionReference).trim() : `PAY-${Date.now().toString().slice(-6)}`,
    notes: notes ? String(notes).trim() : '',
    status: 'Completed',
    createdBy: req.user._id,
  });

  await payment.save();

  const newPaidAmount = round2(currentPaid + cleanAmount);
  payroll.paidAmount = newPaidAmount;
  payroll.status = newPaidAmount >= netPayable - 0.005 ? 'Paid' : 'Partially Paid';
  await payroll.save();

  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully.',
    payment,
    data: payment,
    payroll: {
      id: payroll._id,
      paidAmount: payroll.paidAmount,
      netPayable: payroll.netPayable,
      remainingAmount: payroll.remainingAmount,
      status: payroll.status,
    },
  });
});

exports.void = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const payment = await Payment.findById(assertId(req.params.id, 'payment'));
  if (!payment) throw new ApiError(404, 'Payment record not found.');

  if (payment.status === 'Voided') {
    throw new ApiError(400, 'Payment has already been voided.');
  }

  payment.status = 'Voided';
  payment.voidReason = reason ? String(reason).trim() : 'Voided by admin';
  payment.voidedAt = new Date();
  payment.voidedBy = req.user._id;
  await payment.save();

  const payroll = await Payroll.findById(payment.payroll);
  if (payroll) {
    payroll.paidAmount = Math.max(0, round2((payroll.paidAmount || 0) - payment.amount));
    if (payroll.paidAmount <= 0) {
      payroll.status = 'Finalized';
    } else if (payroll.paidAmount < payroll.netPayable - 0.005) {
      payroll.status = 'Partially Paid';
    } else {
      payroll.status = 'Paid';
    }
    await payroll.save();
  }

  res.status(200).json({
    success: true,
    message: 'Payment voided successfully. Payroll balance reopened.',
    payment,
    data: payment,
    payroll,
  });
});
