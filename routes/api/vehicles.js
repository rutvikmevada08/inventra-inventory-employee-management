const express = require("express");
const router = express.Router();
const Vehicle = require("../../models/vehicles");
const Fuel = require("../../models/fuel");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// GET /api/vehicles (List vehicles)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const vehicles = await Vehicle.find(filter).sort({ Vehicle_name: 1 });
    return res.json({ vehicles });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch vehicles." });
  }
});

// GET /api/vehicles/:id (Vehicle details & fuel stats)
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found." });
    }

    const fuelRecords = await Fuel.find({ Vehicle_num: vehicle._id })
      .populate("Vendor")
      .populate("Fueled_by", "name employeeId")
      .sort({ Date: -1 });

    const totalLitres = fuelRecords.reduce((sum, f) => sum + (f.Litre || 0), 0);
    const totalSpent = fuelRecords.reduce((sum, f) => sum + (f.Total || 0), 0);

    return res.json({
      vehicle,
      fuelRecords,
      stats: {
        totalRecords: fuelRecords.length,
        totalLitres: Math.round(totalLitres * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch vehicle details." });
  }
});

// POST /api/vehicles (Create Vehicle - Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { Vehicle_name, Vehicle_number, type, status, notes } = req.body;

    if (!Vehicle_name || !Vehicle_number) {
      return res.status(400).json({ error: "Vehicle name and registration number are required." });
    }

    const cleanNumber = Vehicle_number.trim().toUpperCase();
    const existing = await Vehicle.findOne({ Vehicle_number: cleanNumber });
    if (existing) {
      return res.status(400).json({ error: "Vehicle with this registration number already exists." });
    }

    const vehicle = new Vehicle({
      Vehicle_name: Vehicle_name.trim(),
      Vehicle_number: cleanNumber,
      type: type || "Car",
      status: status || "Active",
      notes: notes ? notes.trim() : "",
      isActive: true,
    });

    await vehicle.save();
    return res.status(201).json({ message: "Vehicle added successfully.", vehicle });
  } catch (error) {
    console.error("Create vehicle error:", error);
    return res.status(500).json({ error: "Failed to create vehicle." });
  }
});

// PUT /api/vehicles/:id (Update Vehicle - Admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found." });
    }

    const { Vehicle_name, Vehicle_number, type, status, notes, isActive } = req.body;

    if (Vehicle_number && Vehicle_number.trim().toUpperCase() !== vehicle.Vehicle_number) {
      const existing = await Vehicle.findOne({
        Vehicle_number: Vehicle_number.trim().toUpperCase(),
        _id: { $ne: vehicle._id },
      });
      if (existing) {
        return res.status(400).json({ error: "Vehicle registration number already taken." });
      }
      vehicle.Vehicle_number = Vehicle_number.trim().toUpperCase();
    }

    if (Vehicle_name) vehicle.Vehicle_name = Vehicle_name.trim();
    if (type !== undefined) vehicle.type = type;
    if (status !== undefined) vehicle.status = status;
    if (notes !== undefined) vehicle.notes = notes.trim();
    if (isActive !== undefined) vehicle.isActive = Boolean(isActive);

    await vehicle.save();
    return res.json({ message: "Vehicle updated successfully.", vehicle });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update vehicle." });
  }
});

module.exports = router;
