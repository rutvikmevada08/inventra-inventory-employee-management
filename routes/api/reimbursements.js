const express = require("express");
const router = express.Router();
const Reimbursement = require("../../models/reimbursement");
const Employee = require("../../models/employees");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const upload = require("../../middleware/upload");

// GET /api/reimbursements (List reimbursements with filters)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate } = req.query;
    const filter = {};

    if (employeeId) filter.employee = employeeId;
    if (status) filter.Status = status;

    if (startDate && endDate) {
      filter.Date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const reimbursements = await Reimbursement.find(filter)
      .populate("employee", "name employeeId department email")
      .populate("approvedBy", "name email")
      .sort({ Date: -1, createdAt: -1 });

    const totalAmount = reimbursements.reduce((sum, r) => sum + (r.Amount || 0), 0);
    const paidAmount = reimbursements.reduce(
      (sum, r) => sum + (["Paid", "Reimbursed"].includes(r.Status) ? r.Amount || 0 : 0),
      0
    );
    const pendingAmount = reimbursements.reduce(
      (sum, r) => sum + (["Requested", "Approved", "Pending"].includes(r.Status) ? r.Amount || 0 : 0),
      0
    );

    return res.json({
      reimbursements,
      summary: {
        totalCount: reimbursements.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        paidAmount: Math.round(paidAmount * 100) / 100,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Fetch reimbursements error:", error);
    return res.status(500).json({ error: "Failed to fetch reimbursements." });
  }
});

// POST /api/reimbursements (Request reimbursement with invoice upload)
router.post("/", authenticateToken, upload.single("invoice"), async (req, res) => {
  try {
    const { employeeId, Date: rDate, Amount, Spent_on, Vendor, Invoice_number, notes } = req.body;

    if (!employeeId || !Amount || !Spent_on) {
      return res.status(400).json({ error: "Employee, amount, and purpose (spent on) are required." });
    }

    const amountNum = Math.round(Number(Amount) * 100) / 100;
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number." });
    }

    const invoicePath = req.file ? `/api/files/uploads/${req.file.filename}` : "";

    const reimbursement = new Reimbursement({
      employee: employeeId,
      Date: rDate ? new Date(rDate) : new Date(),
      Amount: amountNum,
      Spent_on: Spent_on.trim(),
      Vendor: Vendor ? Vendor.trim() : "",
      Invoice_number: Invoice_number ? Invoice_number.trim() : "",
      Invoice: invoicePath,
      Status: "Requested",
      notes: notes ? notes.trim() : "",
    });

    await reimbursement.save();
    const populated = await Reimbursement.findById(reimbursement._id).populate("employee");

    return res.status(201).json({ message: "Reimbursement requested successfully.", reimbursement: populated });
  } catch (error) {
    console.error("Create reimbursement error:", error);
    return res.status(500).json({ error: "Failed to request reimbursement." });
  }
});

// POST /api/reimbursements/:id/approve (Admin only)
router.post("/:id/approve", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findById(req.params.id);
    if (!reimbursement) {
      return res.status(404).json({ error: "Reimbursement not found." });
    }

    if (["Paid", "Reimbursed"].includes(reimbursement.Status)) {
      return res.status(400).json({ error: "Reimbursement is already paid and locked." });
    }

    reimbursement.Status = "Approved";
    reimbursement.approvedBy = req.user._id;
    reimbursement.approvedAt = new Date();
    await reimbursement.save();

    return res.json({ message: "Reimbursement approved successfully.", reimbursement });
  } catch (error) {
    return res.status(500).json({ error: "Failed to approve reimbursement." });
  }
});

// POST /api/reimbursements/:id/pay (Admin only - Mark as Paid & Locked)
router.post("/:id/pay", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { paidBy } = req.body;
    const reimbursement = await Reimbursement.findById(req.params.id);
    if (!reimbursement) {
      return res.status(404).json({ error: "Reimbursement not found." });
    }

    if (["Paid", "Reimbursed"].includes(reimbursement.Status)) {
      return res.status(400).json({ error: "Reimbursement is already paid and locked." });
    }

    reimbursement.Status = "Paid";
    reimbursement.Paid_by = paidBy ? paidBy.trim() : (process.env.DEFAULT_PAYER || "Sanjeev Sharma");
    reimbursement.paidAt = new Date();
    await reimbursement.save();

    return res.json({ message: "Reimbursement paid and locked successfully.", reimbursement });
  } catch (error) {
    return res.status(500).json({ error: "Failed to mark reimbursement as paid." });
  }
});

module.exports = router;
