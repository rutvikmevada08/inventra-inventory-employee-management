const express = require("express");
const router = express.Router();
const Expense = require("../../models/Expense");
const Vendor = require("../../models/vendors");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// GET /api/expenses (List expenses with filters & totals)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { category, status, vendorId, startDate, endDate } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (vendorId) filter.vendor = vendorId;

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const expenses = await Expense.find(filter)
      .populate("vendor")
      .populate("createdBy", "name email")
      .sort({ date: -1 });

    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return res.json({
      expenses,
      totalAmount: Math.round(totalAmount * 100) / 100,
    });
  } catch (error) {
    console.error("Fetch expenses error:", error);
    return res.status(500).json({ error: "Failed to fetch expenses." });
  }
});

// POST /api/expenses (Record Expense - Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, amount, date, description, vendorId, personName, reference, status, notes } = req.body;

    if (!category || !amount || !description) {
      return res.status(400).json({ error: "Category, amount, and description are required." });
    }

    const amountNum = Math.round(Number(amount) * 100) / 100;
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number." });
    }

    const expense = new Expense({
      category: category.trim(),
      amount: amountNum,
      date: date ? new Date(date) : new Date(),
      description: description.trim(),
      vendor: vendorId || undefined,
      personName: personName ? personName.trim() : "",
      reference: reference ? reference.trim() : `EXP-${Date.now().toString().slice(-6)}`,
      status: status || "Paid",
      notes: notes ? notes.trim() : "",
      createdBy: req.user._id,
    });

    await expense.save();
    const populated = await Expense.findById(expense._id).populate("vendor");

    return res.status(201).json({ message: "Expense recorded successfully.", expense: populated });
  } catch (error) {
    console.error("Create expense error:", error);
    return res.status(500).json({ error: "Failed to record expense." });
  }
});

// PUT /api/expenses/:id (Update Expense - Admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found." });
    }

    const { category, amount, date, description, vendorId, personName, reference, status, notes } = req.body;

    if (category) expense.category = category.trim();
    if (amount) expense.amount = Math.round(Number(amount) * 100) / 100;
    if (date) expense.date = new Date(date);
    if (description) expense.description = description.trim();
    if (vendorId !== undefined) expense.vendor = vendorId || undefined;
    if (personName !== undefined) expense.personName = personName ? personName.trim() : "";
    if (reference !== undefined) expense.reference = reference ? reference.trim() : "";
    if (status) expense.status = status;
    if (notes !== undefined) expense.notes = notes ? notes.trim() : "";

    await expense.save();
    return res.json({ message: "Expense updated successfully.", expense });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update expense." });
  }
});

module.exports = router;
