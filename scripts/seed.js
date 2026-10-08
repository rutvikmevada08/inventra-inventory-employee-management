require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const ItemType = require("../models/item_types");
const defaultItemTypes = require("../Service_types");

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/inventory_management";

async function seed() {
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB for seeding...");

  // 1. Create Default Admin if none exists
  const existingAdmin = await User.findOne({ role: "admin" });
  if (!existingAdmin) {
    const hashedPassword = await User.hashPassword("Admin@123");
    const adminUser = new User({
      name: "System Administrator",
      email: "admin@company.com",
      password: hashedPassword,
      role: "admin",
      phone: "9876543210",
      isActive: true,
    });
    await adminUser.save();
    console.log("[✓] Admin user seeded: admin@company.com / Admin@123");
  } else {
    console.log("[i] Admin user already exists:", existingAdmin.email);
  }

  // 2. Create Default Staff User if none exists
  const existingStaff = await User.findOne({ role: "staff" });
  if (!existingStaff) {
    const hashedPassword = await User.hashPassword("Staff@123");
    const staffUser = new User({
      name: "Staff Member",
      email: "staff@company.com",
      password: hashedPassword,
      role: "staff",
      phone: "9876543211",
      isActive: true,
    });
    await staffUser.save();
    console.log("[✓] Staff user seeded: staff@company.com / Staff@123");
  }

  // 3. Seed default item types if none exist
  const existingTypesCount = await ItemType.countDocuments();
  if (existingTypesCount === 0 && Array.isArray(defaultItemTypes)) {
    for (const typeName of defaultItemTypes) {
      await ItemType.create({
        Type_name: typeName,
        category: "General",
        unit: "pcs",
        isActive: true,
      });
    }
    console.log(`[✓] Seeded ${defaultItemTypes.length} standard item types.`);
  }

  console.log("Seeding complete!");
  await mongoose.disconnect();
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("Seeding failed:", e);
      process.exit(1);
    });
}

module.exports = seed;
