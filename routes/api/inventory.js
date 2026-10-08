const express = require("express");
const router = express.Router();
const Lot = require("../../models/lots");
const Item = require("../../models/items");
const ItemType = require("../../models/item_types");
const Vendor = require("../../models/vendors");
const InventoryLedger = require("../../models/InventoryLedger");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const upload = require("../../middleware/upload");

// GET /api/inventory/item-types (List Item Types)
router.get("/item-types", authenticateToken, async (req, res) => {
  try {
    const itemTypes = await ItemType.find({ isActive: true }).sort({ Type_name: 1 });
    return res.json({ itemTypes });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch item types." });
  }
});

// POST /api/inventory/item-types (Create Item Type - Admin only)
router.post("/item-types", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, unit, description } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Item type name is required." });
    }

    const cleanName = name.trim();
    const existing = await ItemType.findOne({ Type_name: new RegExp(`^${cleanName}$`, "i") });
    if (existing) {
      return res.status(400).json({ error: "Item type already exists." });
    }

    const newItemType = new ItemType({
      Type_name: cleanName,
      category: category ? category.trim() : "General",
      unit: unit ? unit.trim() : "pcs",
      description: description ? description.trim() : "",
      isActive: true,
    });

    await newItemType.save();
    return res.status(201).json({ message: "Item type created successfully.", itemType: newItemType });
  } catch (error) {
    console.error("Create item type error:", error);
    return res.status(500).json({ error: "Failed to create item type." });
  }
});

// GET /api/inventory/stock (Current stock on hand derived from inventory ledger)
router.get("/stock", authenticateToken, async (req, res) => {
  try {
    // Aggregate all ledger entries
    const stockAggregation = await InventoryLedger.aggregate([
      {
        $group: {
          _id: "$itemType",
          totalIn: {
            $sum: {
              $cond: [{ $in: ["$transactionType", ["STOCK_IN", "REVERSAL"]] }, "$quantity", 0],
            },
          },
          totalOut: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "STOCK_OUT"] }, "$quantity", 0],
            },
          },
          totalValueIn: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "STOCK_IN"] }, "$totalCost", 0],
            },
          },
          lastTransaction: { $max: "$createdAt" },
        },
      },
      {
        $project: {
          itemType: "$_id",
          totalIn: 1,
          totalOut: 1,
          currentStock: { $subtract: ["$totalIn", "$totalOut"] },
          totalValueIn: 1,
          lastTransaction: 1,
        },
      },
    ]);

    // Populate itemType details
    const populated = await ItemType.populate(stockAggregation, { path: "itemType" });

    // Also include item types with 0 stock
    const allItemTypes = await ItemType.find({ isActive: true });
    const stockMap = {};
    populated.forEach((s) => {
      if (s.itemType) stockMap[s.itemType._id.toString()] = s;
    });

    const fullStock = allItemTypes.map((it) => {
      const existing = stockMap[it._id.toString()];
      return {
        itemType: it,
        currentStock: existing ? existing.currentStock : 0,
        totalIn: existing ? existing.totalIn : 0,
        totalOut: existing ? existing.totalOut : 0,
        totalValue: existing ? existing.totalValueIn : 0,
        lastTransaction: existing ? existing.lastTransaction : null,
      };
    });

    return res.json({ stock: fullStock });
  } catch (error) {
    console.error("Stock fetch error:", error);
    return res.status(500).json({ error: "Failed to calculate inventory stock." });
  }
});

// GET /api/inventory/ledger (Auditable stock movement ledger)
router.get("/ledger", authenticateToken, async (req, res) => {
  try {
    const { itemTypeId, transactionType, startDate, endDate } = req.query;
    const filter = {};

    if (itemTypeId) filter.itemType = itemTypeId;
    if (transactionType) filter.transactionType = transactionType;
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const ledger = await InventoryLedger.find(filter)
      .populate("itemType")
      .populate("lot", "Invoice_number Purchase_date Vendor")
      .populate("itemRequest", "reason Date Quantity Employee")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.json({ ledger });
  } catch (error) {
    console.error("Ledger fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch inventory ledger." });
  }
});

// GET /api/inventory/lots (List Lots / Purchases)
router.get("/lots", authenticateToken, async (req, res) => {
  try {
    const { vendorId, received, status } = req.query;
    const filter = {};

    if (vendorId) filter.Vendor = vendorId;
    if (received !== undefined) filter.Received = received === "true";

    const lots = await Lot.find(filter)
      .populate("Vendor")
      .populate({
        path: "Items",
        populate: { path: "Item_type" },
      })
      .sort({ Purchase_date: -1, createdAt: -1 });

    return res.json({ lots });
  } catch (error) {
    console.error("Fetch lots error:", error);
    return res.status(500).json({ error: "Failed to fetch lots." });
  }
});

// POST /api/inventory/lots (Create Lot / Purchase with Items & Invoice - Admin only)
router.post("/lots", authenticateToken, requireAdmin, upload.single("invoice"), async (req, res) => {
  try {
    const {
      Vendor: vendorId,
      Purchase_date,
      Invoice_number,
      Total_payable,
      Total_paid,
      Lot_type,
      Paid_by,
      Description,
      items: itemsJson,
    } = req.body;

    if (!vendorId || !Purchase_date || !Invoice_number || Total_payable === undefined) {
      return res.status(400).json({ error: "Vendor, purchase date, invoice number, and total payable are required." });
    }

    let parsedItems = [];
    if (typeof itemsJson === "string") {
      try {
        parsedItems = JSON.parse(itemsJson);
      } catch (e) {
        parsedItems = [];
      }
    } else if (Array.isArray(itemsJson)) {
      parsedItems = itemsJson;
    }

    // Invoice file path
    const invoicePath = req.file ? `/api/files/uploads/${req.file.filename}` : "no-invoice";

    const totalPayableNum = Math.round(Number(Total_payable) * 100) / 100;
    const totalPaidNum = Total_paid ? Math.round(Number(Total_paid) * 100) / 100 : 0;

    const newLot = new Lot({
      Vendor: vendorId,
      Purchase_date: new Date(Purchase_date),
      Invoice_number: Invoice_number.trim(),
      Total_payable: totalPayableNum,
      Total_paid: totalPaidNum,
      Lot_type: Lot_type || "General",
      Paid_by: Paid_by || "Company",
      Description: Description ? Description.trim() : "",
      Invoice: invoicePath,
      Received: false,
    });

    await newLot.save();

    // Create lot items
    const createdItemIds = [];
    if (parsedItems && parsedItems.length > 0) {
      for (const itm of parsedItems) {
        if (!itm.Item_type || !itm.Quantity || !itm.Cost_per_unit) continue;
        const itemDoc = new Item({
          Item_type: itm.Item_type,
          Lot_id: newLot._id,
          Cost_per_unit: Math.round(Number(itm.Cost_per_unit) * 100) / 100,
          Quantity: Number(itm.Quantity),
          Total_payable: Math.round(Number(itm.Total_payable || itm.Cost_per_unit * itm.Quantity) * 100) / 100,
        });
        await itemDoc.save();
        createdItemIds.push(itemDoc._id);
      }
    }

    newLot.Items = createdItemIds;
    await newLot.save();

    const populatedLot = await Lot.findById(newLot._id)
      .populate("Vendor")
      .populate({
        path: "Items",
        populate: { path: "Item_type" },
      });

    return res.status(201).json({ message: "Lot created successfully.", lot: populatedLot });
  } catch (error) {
    console.error("Create lot error:", error);
    return res.status(500).json({ error: "Failed to create lot: " + error.message });
  }
});

// POST /api/inventory/lots/:id/receive (Receive Stock - creates Stock-In in Ledger)
router.post("/lots/:id/receive", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const lot = await Lot.findById(req.params.id).populate("Items");
    if (!lot) {
      return res.status(404).json({ error: "Lot not found." });
    }

    if (lot.Received) {
      return res.status(400).json({ error: "Duplicate action rejected: this lot has already been received into stock." });
    }

    // Process each item and write to InventoryLedger
    for (const item of lot.Items) {
      // Get current balance for itemType
      const lastEntry = await InventoryLedger.findOne({ itemType: item.Item_type }).sort({ createdAt: -1 });
      const currentBalance = lastEntry ? lastEntry.balanceAfter : 0;
      const newBalance = currentBalance + item.Quantity;

      const ledgerEntry = new InventoryLedger({
        itemType: item.Item_type,
        transactionType: "STOCK_IN",
        quantity: item.Quantity,
        unitCost: item.Cost_per_unit,
        totalCost: item.Total_payable,
        referenceType: "LOT_PURCHASE",
        referenceId: lot._id,
        lot: lot._id,
        balanceAfter: newBalance,
        notes: `Received from Lot invoice #${lot.Invoice_number}`,
        createdBy: req.user._id,
      });

      await ledgerEntry.save();
    }

    lot.Received = true;
    lot.receivedAt = new Date();
    lot.receivedBy = req.user._id;
    await lot.save();

    return res.json({ message: "Stock received successfully and recorded in inventory ledger.", lot });
  } catch (error) {
    console.error("Receive lot error:", error);
    return res.status(500).json({ error: "Failed to receive lot." });
  }
});

// POST /api/inventory/lots/:id/payment (Part payment or full payment against lot)
router.post("/lots/:id/payment", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Valid payment amount is required." });
    }

    const lot = await Lot.findById(req.params.id);
    if (!lot) {
      return res.status(404).json({ error: "Lot not found." });
    }

    const payAmount = Math.round(Number(amount) * 100) / 100;
    const remaining = Math.round(Math.max(0, lot.Total_payable - lot.Total_paid) * 100) / 100;

    if (payAmount > remaining) {
      return res.status(400).json({
        error: `Overpayment rejected: payment of ₹${payAmount.toFixed(2)} exceeds remaining balance of ₹${remaining.toFixed(2)}.`,
      });
    }

    lot.Total_paid = Math.round((lot.Total_paid + payAmount) * 100) / 100;
    await lot.save();

    return res.json({ message: "Payment recorded successfully.", lot });
  } catch (error) {
    return res.status(500).json({ error: "Failed to record payment on lot." });
  }
});

// POST /api/inventory/lots/:id/mark-clear (Mark-as-clear settlement)
router.post("/lots/:id/mark-clear", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const lot = await Lot.findById(req.params.id);
    if (!lot) {
      return res.status(404).json({ error: "Lot not found." });
    }

    lot.Total_paid = lot.Total_payable;
    await lot.save();

    return res.json({ message: "Lot marked as cleared (fully paid).", lot });
  } catch (error) {
    return res.status(500).json({ error: "Failed to mark lot as cleared." });
  }
});

module.exports = router;
