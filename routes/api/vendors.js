const express = require("express");
const router = express.Router();
const Vendor = require("../../models/vendors");
const Lot = require("../../models/lots");
const Fuel = require("../../models/fuel");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// GET /api/vendors (List & Search)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { Business_name: regex },
        { Business_email: regex },
        { Business_contact_number: regex },
        { address: regex },
      ];
    }

    const vendors = await Vendor.find(filter).sort({ Business_name: 1 });
    return res.json({ vendors });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch vendors." });
  }
});

// GET /api/vendors/:id (Vendor details and purchase history)
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found." });
    }

    const lots = await Lot.find({ Vendor: vendor._id }).sort({ Purchase_date: -1 });
    const fuels = await Fuel.find({ Vendor: vendor._id }).sort({ Date: -1 });

    const totalLotPayable = lots.reduce((sum, l) => sum + (l.Total_payable || 0), 0);
    const totalLotPaid = lots.reduce((sum, l) => sum + (l.Total_paid || 0), 0);
    const totalFuelSpent = fuels.reduce((sum, f) => sum + (f.Total || 0), 0);

    return res.json({
      vendor,
      lots,
      fuels,
      stats: {
        totalLots: lots.length,
        totalLotPayable: Math.round(totalLotPayable * 100) / 100,
        totalLotPaid: Math.round(totalLotPaid * 100) / 100,
        lotBalance: Math.round(Math.max(0, totalLotPayable - totalLotPaid) * 100) / 100,
        totalFuelPurchases: fuels.length,
        totalFuelSpent: Math.round(totalFuelSpent * 100) / 100,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch vendor details." });
  }
});

// POST /api/vendors (Create Vendor - Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { Business_name, Business_email, Business_contact_number, address, notes } = req.body;

    if (!Business_name || !Business_contact_number) {
      return res.status(400).json({ error: "Vendor business name and contact number are required." });
    }

    const vendor = new Vendor({
      Business_name: Business_name.trim(),
      Business_email: Business_email ? Business_email.trim() : "",
      Business_contact_number: String(Business_contact_number).trim(),
      address: address ? address.trim() : "",
      notes: notes ? notes.trim() : "",
      isActive: true,
    });

    await vendor.save();
    return res.status(201).json({ message: "Vendor created successfully.", vendor });
  } catch (error) {
    console.error("Create vendor error:", error);
    return res.status(500).json({ error: "Failed to create vendor." });
  }
});

// PUT /api/vendors/:id (Update Vendor - Admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found." });
    }

    const { Business_name, Business_email, Business_contact_number, address, notes, isActive } = req.body;

    if (Business_name) vendor.Business_name = Business_name.trim();
    if (Business_email !== undefined) vendor.Business_email = Business_email.trim();
    if (Business_contact_number !== undefined) vendor.Business_contact_number = String(Business_contact_number).trim();
    if (address !== undefined) vendor.address = address.trim();
    if (notes !== undefined) vendor.notes = notes.trim();
    if (isActive !== undefined) vendor.isActive = Boolean(isActive);

    await vendor.save();
    return res.json({ message: "Vendor updated successfully.", vendor });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update vendor." });
  }
});

module.exports = router;
