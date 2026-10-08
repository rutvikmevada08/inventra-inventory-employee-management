/**
 * Comprehensive Test Suite for Inventory + Workforce Management
 */
require("dotenv").config();
const mongoose = require("mongoose");
const request = require("supertest");
const assert = require("assert");
const app = require("../app");

const TEST_DB_URI = process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/inventory_management_test";

let adminToken = "";
let staffToken = "";
let testEmployeeId = "";
let testPayrollId = "";
let testLotId = "";
let testItemTypeId = "";
let testRequestId = "";
let testVehicleId = "";
let testVendorId = "";
let testReimbId = "";

const suiteResults = [];

function recordTest(suiteName, testName, passed, error = null) {
  suiteResults.push({ suite: suiteName, name: testName, status: passed ? "PASSED" : "FAILED", error });
  if (passed) {
    console.log(`  [✓] ${testName}`);
  } else {
    console.error(`  [✗] ${testName}: ${error?.message || error}`);
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("STARTING FULL END-TO-END AUTOMATED TEST SUITE");
  console.log(`Connecting to Test MongoDB: ${TEST_DB_URI}`);
  console.log("==================================================\n");

  try {
    await mongoose.connect(TEST_DB_URI);
    // Clear test database collections
    const collections = await mongoose.connection.db.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }

  // ----------------------------------------------------
  // SUITE 1: AUTHENTICATION & AUTHORIZATION
  // ----------------------------------------------------
  console.log("\n[SUITE 1: Authentication & Authorization]");
  const User = require("../models/User");

  try {
    const adminPass = await User.hashPassword("AdminPass123!");
    const staffPass = await User.hashPassword("StaffPass123!");

    const admin = await User.create({
      name: "Admin User",
      email: "testadmin@company.com",
      password: adminPass,
      role: "admin",
      isActive: true,
    });

    const staff = await User.create({
      name: "Staff User",
      email: "teststaff@company.com",
      password: staffPass,
      role: "staff",
      isActive: true,
    });

    // 1.1 Admin login
    const resAdmin = await request(app)
      .post("/api/auth/login")
      .send({ email: "testadmin@company.com", password: "AdminPass123!" });
    assert.strictEqual(resAdmin.status, 200);
    assert.ok(resAdmin.body.token);
    adminToken = resAdmin.body.token;
    recordTest("Auth", "Admin login returns valid JWT token", true);

    // 1.2 Staff login
    const resStaff = await request(app)
      .post("/api/auth/login")
      .send({ email: "teststaff@company.com", password: "StaffPass123!" });
    assert.strictEqual(resStaff.status, 200);
    staffToken = resStaff.body.token;
    recordTest("Auth", "Staff login returns valid JWT token", true);

    // 1.3 Invalid password rejected
    const resBad = await request(app)
      .post("/api/auth/login")
      .send({ email: "testadmin@company.com", password: "WrongPassword" });
    assert.strictEqual(resBad.status, 401);
    recordTest("Auth", "Invalid password rejected with 401 Unauthorized", true);

    // 1.4 Unauthenticated request rejected
    const resUnauth = await request(app).get("/api/employees");
    assert.strictEqual(resUnauth.status, 401);
    recordTest("Auth", "Unauthenticated request rejected with 401", true);

    // 1.5 Role restriction: Staff accessing Admin-only route is forbidden (403)
    const resForbidden = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ name: "Worker" });
    assert.strictEqual(resForbidden.status, 403);
    recordTest("Auth", "Staff forbidden from Admin routes with 403", true);
  } catch (e) {
    recordTest("Auth", "Authentication suite error", false, e);
  }

  // ----------------------------------------------------
  // SUITE 2: WORKFORCE, ATTENDANCE & DAILY WAGES
  // ----------------------------------------------------
  console.log("\n[SUITE 2: Workforce, Attendance & Daily Wages]");
  try {
    // 2.1 Create Employee
    const resEmp = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        employeeId: "EMP-001",
        name: "Ramesh Kumar",
        dailyWage: 600,
        department: "Operations",
        designation: "Field Technician",
        phone: "9876543210",
        employmentType: "Daily Wage",
      });
    assert.strictEqual(resEmp.status, 201);
    assert.strictEqual(resEmp.body.employee.name, "Ramesh Kumar");
    testEmployeeId = resEmp.body.employee._id;
    recordTest("Workforce", "Admin can register employee with daily wage rate", true);

    // 2.2 Record Attendance (Present = 1.0)
    const resAtt1 = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        employeeId: testEmployeeId,
        date: "2026-10-01",
        status: "Present",
      });
    assert.strictEqual(resAtt1.status, 201);
    assert.strictEqual(resAtt1.body.record.eligibleDays, 1.0);
    recordTest("Attendance", "Attendance Present calculates eligibleDays = 1.0", true);

    // 2.3 Record Attendance (Half Day = 0.5)
    const resAtt2 = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        employeeId: testEmployeeId,
        date: "2026-10-02",
        status: "Half Day",
      });
    assert.strictEqual(resAtt2.status, 201);
    assert.strictEqual(resAtt2.body.record.eligibleDays, 0.5);
    recordTest("Attendance", "Attendance Half Day calculates eligibleDays = 0.5", true);

    // 2.4 Duplicate Attendance on same date is updated or rejected cleanly
    const resAttDup = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        employeeId: testEmployeeId,
        date: "2026-10-01",
        status: "Present",
      });
    assert.strictEqual(resAttDup.status, 200); // Updated cleanly without creating duplicate row
    recordTest("Attendance", "Duplicate attendance date handled safely without duplicates", true);

    // 2.5 Daily Wage Calculation Engine
    const resWage = await request(app)
      .get("/api/attendance/wages?month=2026-10")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resWage.status, 200);
    const wageData = resWage.body.wages.find((w) => w.employee._id.toString() === testEmployeeId.toString());
    assert.ok(wageData);
    assert.strictEqual(wageData.eligibleDays, 1.5); // 1.0 + 0.5
    assert.strictEqual(wageData.grossWage, 900); // 1.5 * 600
    recordTest("Daily Wages", "Backend accurately calculates eligibleDays (1.5) and gross wage (₹900.00)", true);
  } catch (e) {
    recordTest("Workforce", "Workforce suite error", false, e);
  }

  // ----------------------------------------------------
  // SUITE 3: PAYROLL, ADVANCES & DISBURSEMENTS
  // ----------------------------------------------------
  console.log("\n[SUITE 3: Payroll, Advances & Disbursements]");
  try {
    // 3.1 Disburse Advance
    const resAdv = await request(app)
      .post("/api/advances")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        employeeId: testEmployeeId,
        amount: 200,
        payrollMonth: "2026-10",
        reason: "Field travel advance",
      });
    assert.strictEqual(resAdv.status, 201);
    assert.strictEqual(resAdv.body.advance.amount, 200);
    recordTest("Advances", "Admin can disburse advance linked to payroll month", true);

    // 3.2 Generate Payroll
    const resPayGen = await request(app)
      .post("/api/payroll/generate")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ month: "2026-10" });
    assert.strictEqual(resPayGen.status, 200);

    const resPayList = await request(app)
      .get("/api/payroll?month=2026-10")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resPayList.status, 200);
    const payroll = resPayList.body.payrolls.find((p) => p.employee._id.toString() === testEmployeeId.toString());
    assert.ok(payroll);
    testPayrollId = payroll._id;
    assert.strictEqual(payroll.grossAmount, 900);
    assert.strictEqual(payroll.advances, 200);
    assert.strictEqual(payroll.netPayable, 700); // 900 - 200
    assert.strictEqual(payroll.status, "Draft");
    recordTest("Payroll", "Payroll generates Gross (₹900) - Advance (₹200) = Net Payable (₹700)", true);

    // 3.3 Finalize & Lock Payroll
    const resFin = await request(app)
      .post(`/api/payroll/${testPayrollId}/finalize`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resFin.status, 200);
    assert.strictEqual(resFin.body.payroll.status, "Finalized");
    recordTest("Payroll", "Finalize locks payroll status and deducts advance", true);

    // 3.4 Partial Payment
    const resPay1 = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        payrollId: testPayrollId,
        amount: 300,
        paymentMethod: "Bank Transfer",
        transactionReference: "UTR-TEST-001",
      });
    assert.strictEqual(resPay1.status, 201);
    assert.strictEqual(resPay1.body.payroll.paidAmount, 300);
    assert.strictEqual(resPay1.body.payroll.status, "Partially Paid");
    recordTest("Payments", "Partial payment (₹300) updates payroll to Partially Paid", true);

    // 3.5 Overpayment Rejection
    const resOverpay = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        payrollId: testPayrollId,
        amount: 500, // Remaining is 400 (700 - 300)
      });
    assert.strictEqual(resOverpay.status, 400);
    recordTest("Payments", "Overpayment of ₹500 (exceeding remaining ₹400) rejected with 400", true);

    // 3.6 Final Settlement Payment
    const resPay2 = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        payrollId: testPayrollId,
        amount: 400,
        paymentMethod: "UPI",
        transactionReference: "UPI-TEST-002",
      });
    assert.strictEqual(resPay2.status, 201);
    assert.strictEqual(resPay2.body.payroll.paidAmount, 700);
    assert.strictEqual(resPay2.body.payroll.status, "Paid");
    recordTest("Payments", "Final payment (₹400) completes payroll and updates status to Paid", true);

    // 3.7 Void Payment Reversal
    const paymentIdToVoid = resPay2.body.payment._id;
    const resVoid = await request(app)
      .post(`/api/payments/${paymentIdToVoid}/void`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Testing audit reversal" });
    assert.strictEqual(resVoid.status, 200);
    assert.strictEqual(resVoid.body.payment.status, "Voided");

    // Check payroll reopened
    const resCheckPayroll = await request(app)
      .get(`/api/payroll/${testPayrollId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resCheckPayroll.body.payroll.paidAmount, 300);
    assert.strictEqual(resCheckPayroll.body.payroll.status, "Partially Paid");
    recordTest("Payments", "Voiding payment accurately reverts paid amount and reopens payroll balance", true);
  } catch (e) {
    recordTest("Payroll", "Payroll & payments suite error", false, e);
  }

  // ----------------------------------------------------
  // SUITE 4: INVENTORY, LEDGER & PURCHASES
  // ----------------------------------------------------
  console.log("\n[SUITE 4: Inventory, Ledger & Purchases]");
  try {
    // 4.1 Create Vendor
    const resVen = await request(app)
      .post("/api/vendors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        Business_name: "Apex Electronics",
        Business_email: "apex@supplies.com",
        Business_contact_number: "9988776655",
        address: "Industrial Area Phase 2",
      });
    assert.strictEqual(resVen.status, 201);
    testVendorId = resVen.body.vendor._id;
    recordTest("Vendors", "Admin can create supplier vendor", true);

    // 4.2 Create Item Type
    const resType = await request(app)
      .post("/api/inventory/item-types")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "LiDAR Mounting Plate",
        category: "Hardware",
        unit: "pcs",
      });
    assert.strictEqual(resType.status, 201);
    testItemTypeId = resType.body.itemType._id;
    recordTest("Inventory", "Admin can create catalog item type", true);

    // 4.3 Create Purchase Lot
    const resLot = await request(app)
      .post("/api/inventory/lots")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        Vendor: testVendorId,
        Purchase_date: "2026-10-05",
        Invoice_number: "INV-2026-901",
        Total_payable: 5000,
        Total_paid: 2000,
        Lot_type: "Hardware",
        Paid_by: "Sanjeev Sharma",
        items: JSON.stringify([
          { Item_type: testItemTypeId, Cost_per_unit: 500, Quantity: 10, Total_payable: 5000 },
        ]),
      });
    assert.strictEqual(resLot.status, 201);
    testLotId = resLot.body.lot._id;
    assert.strictEqual(resLot.body.lot.Received, false);
    recordTest("Inventory", "Admin can create purchase lot with items", true);

    // 4.4 Receive Lot Stock (Writes STOCK_IN to InventoryLedger)
    const resRecv = await request(app)
      .post(`/api/inventory/lots/${testLotId}/receive`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resRecv.status, 200);
    assert.strictEqual(resRecv.body.lot.Received, true);

    // Check stock ledger has STOCK_IN of 10 units
    const resLedger = await request(app)
      .get(`/api/inventory/ledger?itemTypeId=${testItemTypeId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resLedger.status, 200);
    const ledgerIn = resLedger.body.ledger.find((l) => l.transactionType === "STOCK_IN");
    assert.ok(ledgerIn);
    assert.strictEqual(ledgerIn.quantity, 10);
    assert.strictEqual(ledgerIn.balanceAfter, 10);
    recordTest("Inventory", "Receiving lot writes STOCK_IN to ledger with balanceAfter = 10", true);

    // 4.5 Duplicate Receive Rejected
    const resRecvDup = await request(app)
      .post(`/api/inventory/lots/${testLotId}/receive`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resRecvDup.status, 400);
    recordTest("Inventory", "Duplicate stock receiving rejected with 400", true);

    // 4.6 Submit Item Request
    const resReq = await request(app)
      .post("/api/item-requests")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        employeeId: testEmployeeId,
        itemTypeId: testItemTypeId,
        quantity: 3,
        reason: "Vehicle sensor test",
      });
    assert.strictEqual(resReq.status, 201);
    testRequestId = resReq.body.request._id;
    recordTest("Item Requests", "Staff can submit item request", true);

    // 4.7 Issue Item Request (Writes STOCK_OUT to InventoryLedger)
    const resIssue = await request(app)
      .post(`/api/item-requests/${testRequestId}/issue`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resIssue.status, 200);
    assert.strictEqual(resIssue.body.request.Status, "Issued");

    // Check stock balance is now 7 (10 - 3)
    const resStock = await request(app)
      .get("/api/inventory/stock")
      .set("Authorization", `Bearer ${adminToken}`);
    const stockItem = resStock.body.stock.find((s) => s.itemType._id.toString() === testItemTypeId.toString());
    assert.ok(stockItem);
    assert.strictEqual(stockItem.currentStock, 7);
    recordTest("Inventory", "Issuing requested items writes STOCK_OUT and reduces available stock to 7", true);

    // 4.8 Part Payment on Lot
    const resLotPay = await request(app)
      .post(`/api/inventory/lots/${testLotId}/payment`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amount: 1500 });
    assert.strictEqual(resLotPay.status, 200);
    assert.strictEqual(resLotPay.body.lot.Total_paid, 3500); // 2000 + 1500
    recordTest("Inventory", "Part payment on purchase lot recorded correctly", true);

    // 4.9 Mark as Clear
    const resClear = await request(app)
      .post(`/api/inventory/lots/${testLotId}/mark-clear`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resClear.status, 200);
    assert.strictEqual(resClear.body.lot.Total_paid, resClear.body.lot.Total_payable);
    recordTest("Inventory", "Mark-as-clear settles remaining lot balance", true);
  } catch (e) {
    recordTest("Inventory", "Inventory suite error", false, e);
  }

  // ----------------------------------------------------
  // SUITE 5: VEHICLES, FUEL, REIMBURSEMENTS & EXPENSES
  // ----------------------------------------------------
  console.log("\n[SUITE 5: Operations & Fleet Management]");
  try {
    // 5.1 Register Vehicle
    const resVeh = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        Vehicle_name: "Mahindra Thar",
        Vehicle_number: "MP-04-TH-9901",
        type: "Car",
        status: "Active",
      });
    assert.strictEqual(resVeh.status, 201);
    testVehicleId = resVeh.body.vehicle._id;
    recordTest("Vehicles", "Admin can register fleet vehicle", true);

    // 5.2 Refuel Entry
    const resFuel = await request(app)
      .post("/api/fuel")
      .set("Authorization", `Bearer ${staffToken}`)
      .field("Vehicle_num", testVehicleId)
      .field("Vendor", testVendorId)
      .field("Fueled_by", testEmployeeId)
      .field("Date", "2026-10-06")
      .field("Litre", "50")
      .field("Cost_per_litre", "90")
      .field("Total", "4500")
      .field("Invoice_number", "FUEL-8812");
    assert.strictEqual(resFuel.status, 201);
    assert.strictEqual(resFuel.body.fuel.Total, 4500);
    recordTest("Fuel", "Staff can log refuel purchase", true);

    // 5.3 Submit Reimbursement
    const resReimb = await request(app)
      .post("/api/reimbursements")
      .set("Authorization", `Bearer ${staffToken}`)
      .field("employeeId", testEmployeeId)
      .field("Amount", "1250")
      .field("Spent_on", "Field sensor testing battery")
      .field("Vendor", "Local Electronics Store");
    assert.strictEqual(resReimb.status, 201);
    testReimbId = resReimb.body.reimbursement._id;
    assert.strictEqual(resReimb.body.reimbursement.Status, "Requested");
    recordTest("Reimbursements", "Staff can submit reimbursement claim", true);

    // 5.4 Approve Reimbursement
    const resApprove = await request(app)
      .post(`/api/reimbursements/${testReimbId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resApprove.status, 200);
    assert.strictEqual(resApprove.body.reimbursement.Status, "Approved");
    recordTest("Reimbursements", "Admin can approve reimbursement claim", true);

    // 5.5 Disburse and Lock Reimbursement
    const resPayReimb = await request(app)
      .post(`/api/reimbursements/${testReimbId}/pay`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paidBy: "Sanjeev Sharma" });
    assert.strictEqual(resPayReimb.status, 200);
    assert.strictEqual(resPayReimb.body.reimbursement.Status, "Paid");
    recordTest("Reimbursements", "Disbursing reimbursement locks claim status", true);

    // 5.6 General Expense
    const resExp = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        category: "Internet & Broadband",
        amount: 3500,
        description: "Primary fiber connection monthly bill",
        reference: "FIBER-OCT-2026",
      });
    assert.strictEqual(resExp.status, 201);
    assert.strictEqual(resExp.body.expense.amount, 3500);
    recordTest("Expenses", "Admin can record general business operating expense", true);
  } catch (e) {
    recordTest("Operations", "Operations suite error", false, e);
  }

  // ----------------------------------------------------
  // SUITE 6: REPORTS, EXCEL & PDF EXPORTS
  // ----------------------------------------------------
  console.log("\n[SUITE 6: Reports & Document Exports]");
  try {
    const reportTypes = [
      "inventory",
      "stock-movement",
      "purchase",
      "vendor",
      "fuel",
      "reimbursement",
      "employee",
      "attendance",
      "payroll",
      "payment",
      "expense",
    ];

    for (const rType of reportTypes) {
      const res = await request(app)
        .get(`/api/reports/data?type=${rType}`)
        .set("Authorization", `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.type, rType);
    }
    recordTest("Reports", "All 11 report analytics types compile valid data", true);

    // Excel Export
    const resExcel = await request(app)
      .get("/api/reports/export/excel?type=payroll")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resExcel.status, 200);
    assert.ok(resExcel.headers["content-type"].includes("spreadsheetml"));
    recordTest("Reports", "Excel export generates valid XLSX spreadsheet", true);

    // PDF Export
    const resPdf = await request(app)
      .get("/api/reports/export/pdf?type=inventory")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resPdf.status, 200);
    assert.ok(resPdf.headers["content-type"].includes("pdf"));
    recordTest("Reports", "PDF report generator produces valid PDF document", true);

    // Preserved Legacy Sheets
    const resLegacyInv = await request(app)
      .post("/api/reports/legacy/inventory-sheet")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.strictEqual(resLegacyInv.status, 200);
    assert.ok(resLegacyInv.headers["content-type"].includes("spreadsheetml"));
    recordTest("Reports", "Preserved legacy inventory sheet export intact", true);
  } catch (e) {
    recordTest("Reports", "Reports suite error", false, e);
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n==================================================");
  console.log("TEST EXECUTION RESULTS SUMMARY");
  console.log("==================================================");
  const passedCount = suiteResults.filter((r) => r.status === "PASSED").length;
  const failedCount = suiteResults.filter((r) => r.status === "FAILED").length;
  console.log(`TOTAL TESTS RUN: ${suiteResults.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log("==================================================\n");

  await mongoose.disconnect();

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
