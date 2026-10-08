const express = require("express");
const router = express.Router();
const Payment = require("../../models/Payment");
const Payroll = require("../../models/Payroll");
const Employee = require("../../models/employees");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// GET /api/payments (List payments, filter by employee, payroll, date range)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { employeeId, payrollId, startDate, endDate, status } = req.query;
    const filter = {};

    if (employeeId) filter.employee = employeeId;
    if (payrollId) filter.payroll = payrollId;
    if (status) filter.status = status;

    if (startDate && endDate) {
      filter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const payments = await Payment.find(filter)
      .populate("employee", "name employeeId department dailyWage")
      .populate("payroll", "month netPayable paidAmount status")
      .populate("createdBy", "name email")
      .sort({ paymentDate: -1, createdAt: -1 });

    const totalPaid = payments.reduce(
      (sum, p) => sum + (p.status === "Completed" ? p.amount : 0),
      0
    );

    return res.json({
      payments,
      totalPaid: Math.round(totalPaid * 100) / 100,
    });
  } catch (error) {
    console.error("Fetch payments error:", error);
    return res.status(500).json({ error: "Failed to fetch payments." });
  }
});

// POST /api/payments (Record a payment against a payroll)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { payrollId, amount, paymentDate, paymentMethod, transactionReference, notes } = req.body;

    if (!payrollId || !amount) {
      return res.status(400).json({ error: "Payroll reference and amount are required." });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Payment amount must be greater than zero." });
    }
    const cleanAmount = Math.round(parsedAmount * 100) / 100;

    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      return res.status(404).json({ error: "Payroll record not found." });
    }

    // Must not be draft
    if (payroll.status === "Draft") {
      return res.status(400).json({ error: "Cannot record payment on a Draft payroll. Please finalize the payroll first." });
    }

    // Remaining payable calculation
    const currentPaid = payroll.paidAmount || 0;
    const netPayable = payroll.netPayable || 0;
    const remainingPayable = Math.round(Math.max(0, netPayable - currentPaid) * 100) / 100;

    // Overpayment check
    if (cleanAmount > remainingPayable) {
      return res.status(400).json({
        error: `Overpayment rejected: payment amount of ₹${cleanAmount.toFixed(2)} exceeds remaining payable amount of ₹${remainingPayable.toFixed(2)}.`,
      });
    }

    // Append-only payment record
    const payment = new Payment({
      employee: payroll.employee,
      payroll: payroll._id,
      amount: cleanAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || "Bank Transfer",
      transactionReference: transactionReference ? transactionReference.trim() : `PAY-${Date.now().toString().slice(-6)}`,
      notes: notes ? notes.trim() : "",
      status: "Completed",
      createdBy: req.user._id,
    });

    await payment.save();

    // Update payroll paid amount and status
    const newPaidAmount = Math.round((currentPaid + cleanAmount) * 100) / 100;
    payroll.paidAmount = newPaidAmount;
    if (newPaidAmount >= netPayable) {
      payroll.status = "Paid";
    } else {
      payroll.status = "Partially Paid";
    }

    await payroll.save();

    return res.status(201).json({
      message: "Payment recorded successfully.",
      payment,
      payroll: {
        id: payroll._id,
        paidAmount: payroll.paidAmount,
        netPayable: payroll.netPayable,
        remainingAmount: payroll.remainingAmount,
        status: payroll.status,
      },
    });
  } catch (error) {
    console.error("Record payment error:", error);
    return res.status(500).json({ error: "Failed to record payment: " + error.message });
  }
});

// POST /api/payments/:id/void (Void/reverse an existing payment)
router.post("/:id/void", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found." });
    }

    if (payment.status === "Voided") {
      return res.status(400).json({ error: "Payment is already voided." });
    }

    payment.status = "Voided";
    payment.voidReason = reason ? reason.trim() : "Voided by admin";
    payment.voidedAt = new Date();
    payment.voidedBy = req.user._id;
    await payment.save();

    // Revert paidAmount on payroll
    const payroll = await Payroll.findById(payment.payroll);
    if (payroll) {
      const updatedPaid = Math.max(0, Math.round(((payroll.paidAmount || 0) - payment.amount) * 100) / 100);
      payroll.paidAmount = updatedPaid;
      if (updatedPaid === 0) {
        payroll.status = "Finalized";
      } else if (updatedPaid < payroll.netPayable) {
        payroll.status = "Partially Paid";
      } else {
        payroll.status = "Paid";
      }
      await payroll.save();
    }

    return res.json({ message: "Payment voided successfully.", payment });
  } catch (error) {
    console.error("Void payment error:", error);
    return res.status(500).json({ error: "Failed to void payment." });
  }
});

module.exports = router;
