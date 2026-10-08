const express = require("express");
const router = express.Router();
const ItemRequest = require("../../models/item_req");
const ItemType = require("../../models/item_types");
const InventoryLedger = require("../../models/InventoryLedger");
const sendEmail = require("../ohter_functions/sendMail");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// GET /api/item-requests (List requests)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { status, employeeId } = req.query;
    const filter = {};

    if (status) filter.Status = status;
    if (employeeId) filter.Employee = employeeId;

    const requests = await ItemRequest.find(filter)
      .populate("Employee", "name employeeId department email")
      .populate("item")
      .populate("approvedBy", "name email")
      .populate("issuedBy", "name email")
      .sort({ Date: -1, createdAt: -1 });

    return res.json({ requests });
  } catch (error) {
    console.error("Fetch item requests error:", error);
    return res.status(500).json({ error: "Failed to fetch item requests." });
  }
});

// POST /api/item-requests (Create item request - Staff or Admin)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { employeeId, itemTypeId, quantity, reason, date } = req.body;

    if (!employeeId || !itemTypeId || !quantity || !reason) {
      return res.status(400).json({ error: "Employee, item type, quantity, and reason are required." });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than zero." });
    }

    const newReq = new ItemRequest({
      Employee: employeeId,
      item: itemTypeId,
      Quantity: qty,
      reason: reason.trim(),
      Date: date ? new Date(date) : new Date(),
      Status: "Requested",
    });

    await newReq.save();
    const populated = await ItemRequest.findById(newReq._id).populate("Employee").populate("item");

    return res.status(201).json({ message: "Item request submitted successfully.", request: populated });
  } catch (error) {
    console.error("Create item request error:", error);
    return res.status(500).json({ error: "Failed to submit item request." });
  }
});

// POST /api/item-requests/:id/approve (Admin only)
router.post("/:id/approve", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const itemReq = await ItemRequest.findById(req.params.id);
    if (!itemReq) {
      return res.status(404).json({ error: "Item request not found." });
    }

    if (itemReq.Status !== "Requested") {
      return res.status(400).json({ error: `Cannot approve request with status '${itemReq.Status}'.` });
    }

    itemReq.Status = "Approved";
    itemReq.approvedBy = req.user._id;
    itemReq.approvedAt = new Date();
    await itemReq.save();

    return res.json({ message: "Item request approved.", request: itemReq });
  } catch (error) {
    return res.status(500).json({ error: "Failed to approve item request." });
  }
});

// POST /api/item-requests/:id/reject (Admin only)
router.post("/:id/reject", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const itemReq = await ItemRequest.findById(req.params.id).populate("Employee").populate("item");
    if (!itemReq) {
      return res.status(404).json({ error: "Item request not found." });
    }

    itemReq.Status = "Rejected";
    await itemReq.save();

    // Optionally notify via email if employee has email
    if (itemReq.Employee && itemReq.Employee.email) {
      sendEmail(
        itemReq.Employee.email,
        "Item Request Rejected",
        `Hello ${itemReq.Employee.name},\nYour item request for ${itemReq.item ? itemReq.item.Type_name : "items"} has been rejected.\nReason: ${itemReq.reason}`
      ).catch((e) => console.log("Email notification error:", e.message));
    }

    return res.json({ message: "Item request rejected.", request: itemReq });
  } catch (error) {
    return res.status(500).json({ error: "Failed to reject item request." });
  }
});

// POST /api/item-requests/:id/issue (Issue Stock - Creates Stock-Out in Ledger - Admin only)
router.post("/:id/issue", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const itemReq = await ItemRequest.findById(req.params.id).populate("Employee").populate("item");
    if (!itemReq) {
      return res.status(404).json({ error: "Item request not found." });
    }

    if (itemReq.Status === "Issued") {
      return res.status(400).json({ error: "Duplicate action rejected: this item request has already been issued." });
    }

    // Check current stock from ledger
    const lastEntry = await InventoryLedger.findOne({ itemType: itemReq.item._id }).sort({ createdAt: -1 });
    const currentStock = lastEntry ? lastEntry.balanceAfter : 0;

    if (currentStock < itemReq.Quantity) {
      return res.status(400).json({
        error: `Insufficient stock: Requested quantity is ${itemReq.Quantity}, but current available stock is ${currentStock}.`,
      });
    }

    const newBalance = currentStock - itemReq.Quantity;

    // Record STOCK_OUT in ledger
    const ledgerEntry = new InventoryLedger({
      itemType: itemReq.item._id,
      transactionType: "STOCK_OUT",
      quantity: itemReq.Quantity,
      referenceType: "ITEM_REQUEST",
      referenceId: itemReq._id,
      itemRequest: itemReq._id,
      balanceAfter: newBalance,
      notes: `Issued to ${itemReq.Employee ? itemReq.Employee.name : "Employee"} for: ${itemReq.reason}`,
      createdBy: req.user._id,
    });
    await ledgerEntry.save();

    itemReq.Status = "Issued";
    itemReq.issuedBy = req.user._id;
    itemReq.issuedAt = new Date();
    await itemReq.save();

    return res.json({ message: "Stock issued successfully and recorded in inventory ledger.", request: itemReq });
  } catch (error) {
    console.error("Issue item error:", error);
    return res.status(500).json({ error: "Failed to issue item request: " + error.message });
  }
});

module.exports = router;
