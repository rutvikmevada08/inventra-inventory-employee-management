const express = require("express");
const router = express.Router();
const Fuel = require("../../models/fuel");
const Vehicle = require("../../models/vehicles");
const Vendor = require("../../models/vendors");
const { authenticateToken } = require("../../middleware/auth");
const upload = require("../../middleware/upload");

// GET /api/fuel (List fuel entries with filters)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { vehicleId, vendorId, startDate, endDate } = req.query;
    const filter = {};

    if (vehicleId) filter.Vehicle_num = vehicleId;
    if (vendorId) filter.Vendor = vendorId;

    if (startDate && endDate) {
      filter.Date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const records = await Fuel.find(filter)
      .populate("Vehicle_num")
      .populate("Vendor")
      .populate("Fueled_by", "name employeeId department")
      .sort({ Date: -1 });

    const totalLitres = records.reduce((sum, r) => sum + (r.Litre || 0), 0);
    const totalAmount = records.reduce((sum, r) => sum + (r.Total || 0), 0);

    return res.json({
      fuelRecords: records,
      totals: {
        totalLitres: Math.round(totalLitres * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        averageCostPerLitre: totalLitres > 0 ? Math.round((totalAmount / totalLitres) * 100) / 100 : 0,
      },
    });
  } catch (error) {
    console.error("Fetch fuel error:", error);
    return res.status(500).json({ error: "Failed to fetch fuel records." });
  }
});

// POST /api/fuel (Record refuel with invoice upload)
router.post("/", authenticateToken, upload.single("invoice"), async (req, res) => {
  try {
    const {
      Vehicle_num,
      Vendor: vendorId,
      Date: fuelDate,
      Litre,
      Cost_per_litre,
      Total,
      Fueled_by,
      Invoice_number,
      Fuel_type,
      notes,
    } = req.body;

    if (!Vehicle_num || !vendorId || !Litre || (!Cost_per_litre && !Total)) {
      return res.status(400).json({ error: "Vehicle, vendor, litres, and rate/total are required." });
    }

    const litresNum = Math.round(Number(Litre) * 100) / 100;
    const rateNum = Cost_per_litre ? Math.round(Number(Cost_per_litre) * 100) / 100 : Math.round((Number(Total) / litresNum) * 100) / 100;
    const totalNum = Total ? Math.round(Number(Total) * 100) / 100 : Math.round(litresNum * rateNum * 100) / 100;

    const invoicePath = req.file ? `/api/files/uploads/${req.file.filename}` : "";

    const fuel = new Fuel({
      Vehicle_num,
      Vendor: vendorId,
      Date: fuelDate ? new Date(fuelDate) : new Date(),
      Litre: litresNum,
      Cost_per_litre: rateNum,
      Total: totalNum,
      Fueled_by: Fueled_by || req.user._id,
      Invoice_number: Invoice_number ? Invoice_number.trim() : "",
      Invoice: invoicePath,
      Fuel_type: Fuel_type || "Diesel",
      notes: notes ? notes.trim() : "",
    });

    await fuel.save();
    const populated = await Fuel.findById(fuel._id)
      .populate("Vehicle_num")
      .populate("Vendor")
      .populate("Fueled_by", "name employeeId");

    return res.status(201).json({ message: "Fuel record created successfully.", fuel: populated });
  } catch (error) {
    console.error("Create fuel error:", error);
    return res.status(500).json({ error: "Failed to record fuel purchase." });
  }
});

module.exports = router;
