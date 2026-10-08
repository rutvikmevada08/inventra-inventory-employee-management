/**
 * Safe Legacy Migration Script
 *
 * Usage:
 *   Dry run (default - safe, does not modify any database):
 *     node scripts/migrate-legacy.js
 *
 *   Apply migration (only when explicitly requested):
 *     node scripts/migrate-legacy.js --apply
 *
 * Options:
 *   --source-uri <uri>   (default: mongodb://127.0.0.1:27017/test)
 *   --target-uri <uri>   (default: mongodb://127.0.0.1:27017/inventory_management)
 */

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const args = process.argv.slice(2);
const isDryRun = !args.includes("--apply");

function getArgValue(flag, defaultVal) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return defaultVal;
}

const sourceUri = getArgValue("--source-uri", process.env.LEGACY_MONGODB_URI || "mongodb://127.0.0.1:27017/test");
const targetUri = getArgValue("--target-uri", process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/inventory_management");

const uploadsDir = path.join(__dirname, "../public/uploads");

async function runMigration() {
  console.log("=================================================");
  console.log("SMART INVENTORY - LEGACY DATA MIGRATION");
  console.log(`MODE: ${isDryRun ? "DRY RUN (READ-ONLY, NO DATA WRITTEN)" : "APPLY (CHANGES WILL BE COMMITTED)"}`);
  console.log(`Source URI: ${sourceUri}`);
  console.log(`Target URI: ${targetUri}`);
  console.log("=================================================\n");

  const report = {
    users: { found: 0, migrated: 0, skipped: 0 },
    employees: { found: 0, migrated: 0, skipped: 0 },
    vendors: { found: 0, migrated: 0, skipped: 0 },
    itemTypes: { found: 0, migrated: 0, skipped: 0 },
    lots: { found: 0, migrated: 0, skipped: 0 },
    items: { found: 0, migrated: 0, skipped: 0 },
    itemRequests: { found: 0, migrated: 0, skipped: 0 },
    vehicles: { found: 0, migrated: 0, skipped: 0 },
    fuels: { found: 0, migrated: 0, skipped: 0 },
    reimbursements: { found: 0, migrated: 0, skipped: 0 },
    invoiceFiles: { checked: 0, verifiedOnDisk: 0, missingOnDisk: 0 },
    warnings: [],
    errors: [],
  };

  let sourceConn = null;
  let targetConn = null;

  try {
    sourceConn = await mongoose.createConnection(sourceUri).asPromise();
    console.log("[✓] Connected to source database");

    if (!isDryRun) {
      targetConn = await mongoose.createConnection(targetUri).asPromise();
      console.log("[✓] Connected to target database");
    }

    // 1. Employees -> Users + Workforce Employees
    const legacyEmployees = await sourceConn.collection("employees").find({}).toArray();
    report.employees.found = legacyEmployees.length;

    for (const le of legacyEmployees) {
      const email = (le.Email || le.email || "").toLowerCase().trim();
      const name = le.Name || le.name || "Employee";

      // File validation check if avatar or doc present
      if (le.Password || le.password) {
        report.users.found++;
      }

      if (!isDryRun && targetConn) {
        let userDocId = null;
        if (email && (le.Password || le.password)) {
          const rawPass = le.Password || le.password;
          const hashed = await bcrypt.hash(rawPass, 10);
          const role = email.includes("admin") || email === "pulkit.upadhyay@deepeigen.com" ? "admin" : "staff";

          const existingUser = await targetConn.collection("users").findOne({ email });
          if (!existingUser) {
            const insUser = await targetConn.collection("users").insertOne({
              name,
              email,
              password: hashed,
              role,
              phone: String(le.Number || le.phone || ""),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            userDocId = insUser.insertedId;
            report.users.migrated++;
          } else {
            userDocId = existingUser._id;
            report.users.skipped++;
          }
        }

        const existingEmp = await targetConn.collection("employees").findOne({ _id: le._id });
        if (!existingEmp) {
          await targetConn.collection("employees").insertOne({
            _id: le._id,
            employeeId: "EMP-" + le._id.toString().slice(-6).toUpperCase(),
            name,
            Name: name,
            email,
            Email: email,
            phone: String(le.Number || le.phone || ""),
            Number: le.Number,
            department: "Operations",
            designation: "Staff",
            dailyWage: 500,
            employmentType: "Daily Wage",
            isActive: true,
            user: userDocId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          report.employees.migrated++;
        } else {
          report.employees.skipped++;
        }
      }
    }

    // 2. Vendors
    const legacyVendors = await sourceConn.collection("vendors").find({}).toArray();
    report.vendors.found = legacyVendors.length;
    for (const lv of legacyVendors) {
      if (!isDryRun && targetConn) {
        const existing = await targetConn.collection("vendors").findOne({ _id: lv._id });
        if (!existing) {
          await targetConn.collection("vendors").insertOne({
            _id: lv._id,
            Business_name: lv.Business_name,
            Business_email: lv.Business_email || "",
            Business_contact_number: String(lv.Business_contact_number || ""),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          report.vendors.migrated++;
        } else {
          report.vendors.skipped++;
        }
      }
    }

    // 3. Item Types
    const legacyTypes = await sourceConn.collection("itemtypes").find({}).toArray();
    report.itemTypes.found = legacyTypes.length;
    for (const lt of legacyTypes) {
      if (!isDryRun && targetConn) {
        const existing = await targetConn.collection("itemtypes").findOne({ _id: lt._id });
        if (!existing) {
          await targetConn.collection("itemtypes").insertOne({
            _id: lt._id,
            Type_name: lt.Type_name,
            category: "General",
            unit: "pcs",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          report.itemTypes.migrated++;
        } else {
          report.itemTypes.skipped++;
        }
      }
    }

    // 4. Lots & Files
    const legacyLots = await sourceConn.collection("lots").find({}).toArray();
    report.lots.found = legacyLots.length;
    for (const ll of legacyLots) {
      if (ll.Invoice) {
        report.invoiceFiles.checked++;
        const filename = path.basename(ll.Invoice);
        if (fs.existsSync(path.join(uploadsDir, filename))) {
          report.invoiceFiles.verifiedOnDisk++;
        } else {
          report.invoiceFiles.missingOnDisk++;
          report.warnings.push(`Invoice file missing on disk for Lot ${ll.Invoice_number}: ${filename}`);
        }
      }

      if (!isDryRun && targetConn) {
        const existing = await targetConn.collection("lots").findOne({ _id: ll._id });
        if (!existing) {
          await targetConn.collection("lots").insertOne({
            ...ll,
            createdAt: ll.createdAt || new Date(),
            updatedAt: new Date(),
          });
          report.lots.migrated++;
        } else {
          report.lots.skipped++;
        }
      }
    }

    // 5. Items
    const legacyItems = await sourceConn.collection("items").find({}).toArray();
    report.items.found = legacyItems.length;
    for (const li of legacyItems) {
      if (!isDryRun && targetConn) {
        const existing = await targetConn.collection("items").findOne({ _id: li._id });
        if (!existing) {
          await targetConn.collection("items").insertOne(li);
          report.items.migrated++;
        } else {
          report.items.skipped++;
        }
      }
    }

    // 6. Vehicles
    const legacyVehicles = await sourceConn.collection("vehicles").find({}).toArray();
    report.vehicles.found = legacyVehicles.length;
    for (const lv of legacyVehicles) {
      if (!isDryRun && targetConn) {
        const existing = await targetConn.collection("vehicles").findOne({ _id: lv._id });
        if (!existing) {
          await targetConn.collection("vehicles").insertOne({
            _id: lv._id,
            Vehicle_name: lv.Vehicle_name,
            Vehicle_number: lv.Vehicle_number,
            status: "Active",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          report.vehicles.migrated++;
        } else {
          report.vehicles.skipped++;
        }
      }
    }

    // 7. Fuels
    const legacyFuels = await sourceConn.collection("fuels").find({}).toArray();
    report.fuels.found = legacyFuels.length;
    for (const lf of legacyFuels) {
      if (lf.Invoice) {
        report.invoiceFiles.checked++;
        const filename = path.basename(lf.Invoice);
        if (fs.existsSync(path.join(uploadsDir, filename))) {
          report.invoiceFiles.verifiedOnDisk++;
        } else {
          report.invoiceFiles.missingOnDisk++;
        }
      }
      if (!isDryRun && targetConn) {
        const existing = await targetConn.collection("fuels").findOne({ _id: lf._id });
        if (!existing) {
          await targetConn.collection("fuels").insertOne(lf);
          report.fuels.migrated++;
        } else {
          report.fuels.skipped++;
        }
      }
    }

    // 8. Reimbursements
    const legacyReimbs = await sourceConn.collection("reimbursements").find({}).toArray();
    report.reimbursements.found = legacyReimbs.length;
    for (const lr of legacyReimbs) {
      if (lr.Invoice) {
        report.invoiceFiles.checked++;
        const filename = path.basename(lr.Invoice);
        if (fs.existsSync(path.join(uploadsDir, filename))) {
          report.invoiceFiles.verifiedOnDisk++;
        } else {
          report.invoiceFiles.missingOnDisk++;
        }
      }
      if (!isDryRun && targetConn) {
        const existing = await targetConn.collection("reimbursements").findOne({ _id: lr._id });
        if (!existing) {
          await targetConn.collection("reimbursements").insertOne(lr);
          report.reimbursements.migrated++;
        } else {
          report.reimbursements.skipped++;
        }
      }
    }

    // Print Report
    console.log("\n================ MIGRATION REPORT ================");
    console.log(`Mode: ${isDryRun ? "DRY-RUN (Safe, no changes made)" : "APPLIED"}`);
    console.log(`Employees:      Found: ${report.employees.found}, Migrated: ${report.employees.migrated}`);
    console.log(`Auth Users:     Found: ${report.users.found}, Migrated: ${report.users.migrated}`);
    console.log(`Vendors:        Found: ${report.vendors.found}, Migrated: ${report.vendors.migrated}`);
    console.log(`Item Types:     Found: ${report.itemTypes.found}, Migrated: ${report.itemTypes.migrated}`);
    console.log(`Lots:           Found: ${report.lots.found}, Migrated: ${report.lots.migrated}`);
    console.log(`Items:          Found: ${report.items.found}, Migrated: ${report.items.migrated}`);
    console.log(`Vehicles:       Found: ${report.vehicles.found}, Migrated: ${report.vehicles.migrated}`);
    console.log(`Fuels:          Found: ${report.fuels.found}, Migrated: ${report.fuels.migrated}`);
    console.log(`Reimbursements: Found: ${report.reimbursements.found}, Migrated: ${report.reimbursements.migrated}`);
    console.log(`Invoice Files:  Checked: ${report.invoiceFiles.checked}, Verified on disk: ${report.invoiceFiles.verifiedOnDisk}, Missing: ${report.invoiceFiles.missingOnDisk}`);
    console.log(`Warnings:       ${report.warnings.length}`);
    console.log(`Errors:         ${report.errors.length}`);
    console.log("==================================================\n");

    if (isDryRun) {
      console.log("NOTE: This was a DRY RUN. No database records were modified.");
      console.log("To apply this migration, run: node scripts/migrate-legacy.js --apply\n");
    }
  } catch (err) {
    console.error("Migration error:", err);
    report.errors.push(err.message);
  } finally {
    if (sourceConn) await sourceConn.close();
    if (targetConn) await targetConn.close();
  }

  return report;
}

if (require.main === module) {
  runMigration().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = runMigration;
