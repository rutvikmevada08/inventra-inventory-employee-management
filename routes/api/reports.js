const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { authenticateToken } = require("../../middleware/auth");
const Employee = require("../../models/employees");
const Attendance = require("../../models/Attendance");
const Payroll = require("../../models/Payroll");
const Advance = require("../../models/Advance");
const Payment = require("../../models/Payment");
const Lot = require("../../models/lots");
const Item = require("../../models/items");
const ItemType = require("../../models/item_types");
const InventoryLedger = require("../../models/InventoryLedger");
const Vendor = require("../../models/vendors");
const Vehicle = require("../../models/vehicles");
const Fuel = require("../../models/fuel");
const Reimbursement = require("../../models/reimbursement");
const Expense = require("../../models/Expense");

function formatDate(date) {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
}

// 1. Fetch report data helper
async function fetchReportData(type, filters) {
  const { startDate, endDate, employeeId, vendorId, itemTypeId, vehicleId, status, month } = filters;
  const dateFilter = {};
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    dateFilter.$gte = s;
    dateFilter.$lte = e;
  }

  switch (type) {
    case "inventory": {
      const stockAggregation = await InventoryLedger.aggregate([
        {
          $group: {
            _id: "$itemType",
            totalIn: { $sum: { $cond: [{ $in: ["$transactionType", ["STOCK_IN", "REVERSAL"]] }, "$quantity", 0] } },
            totalOut: { $sum: { $cond: [{ $eq: ["$transactionType", "STOCK_OUT"] }, "$quantity", 0] } },
            totalValueIn: { $sum: { $cond: [{ $eq: ["$transactionType", "STOCK_IN"] }, "$totalCost", 0] } },
          },
        },
      ]);
      const populated = await ItemType.populate(stockAggregation, { path: "itemType" });
      const itemTypes = await ItemType.find({ isActive: true });
      const stockMap = {};
      populated.forEach((s) => {
        if (s.itemType) stockMap[s.itemType._id.toString()] = s;
      });

      return itemTypes.map((it) => {
        const s = stockMap[it._id.toString()];
        const curStock = s ? Math.max(0, s.totalIn - s.totalOut) : 0;
        return {
          itemName: it.Type_name,
          category: it.category || "General",
          unit: it.unit || "pcs",
          inStock: curStock,
          totalReceived: s ? s.totalIn : 0,
          totalIssued: s ? s.totalOut : 0,
          totalValue: s ? Math.round(s.totalValueIn * 100) / 100 : 0,
        };
      });
    }

    case "stock-movement": {
      const f = {};
      if (itemTypeId) f.itemType = itemTypeId;
      if (Object.keys(dateFilter).length) f.createdAt = dateFilter;
      const ledger = await InventoryLedger.find(f).populate("itemType").populate("createdBy", "name").sort({ createdAt: -1 });
      return ledger.map((l) => ({
        date: formatDate(l.createdAt),
        itemName: l.itemType ? l.itemType.Type_name : "-",
        type: l.transactionType,
        quantity: l.quantity,
        unitCost: l.unitCost || 0,
        totalCost: l.totalCost || 0,
        balanceAfter: l.balanceAfter,
        notes: l.notes || "-",
      }));
    }

    case "purchase": {
      const f = {};
      if (vendorId) f.Vendor = vendorId;
      if (Object.keys(dateFilter).length) f.Purchase_date = dateFilter;
      const lots = await Lot.find(f).populate("Vendor").populate("Items").sort({ Purchase_date: -1 });
      return lots.map((l) => ({
        invoiceNo: l.Invoice_number,
        date: formatDate(l.Purchase_date),
        vendor: l.Vendor ? l.Vendor.Business_name : "-",
        totalPayable: l.Total_payable,
        totalPaid: l.Total_paid,
        balance: Math.max(0, Math.round((l.Total_payable - l.Total_paid) * 100) / 100),
        status: l.Total_paid >= l.Total_payable ? "Paid" : l.Total_paid > 0 ? "Partially Paid" : "Unpaid",
        received: l.Received ? "Yes" : "No",
      }));
    }

    case "vendor": {
      const vendors = await Vendor.find().sort({ Business_name: 1 });
      const lots = await Lot.find();
      const fuels = await Fuel.find();
      return vendors.map((v) => {
        const vLots = lots.filter((l) => l.Vendor && l.Vendor.toString() === v._id.toString());
        const vFuels = fuels.filter((f) => f.Vendor && f.Vendor.toString() === f._id.toString());
        const totalPayable = vLots.reduce((sum, l) => sum + (l.Total_payable || 0), 0);
        const totalPaid = vLots.reduce((sum, l) => sum + (l.Total_paid || 0), 0);
        const fuelSpent = vFuels.reduce((sum, f) => sum + (f.Total || 0), 0);
        return {
          vendorName: v.Business_name,
          contact: v.Business_contact_number,
          email: v.Business_email || "-",
          totalLots: vLots.length,
          lotAmount: Math.round(totalPayable * 100) / 100,
          paidAmount: Math.round(totalPaid * 100) / 100,
          pendingBalance: Math.max(0, Math.round((totalPayable - totalPaid) * 100) / 100),
          fuelSpent: Math.round(fuelSpent * 100) / 100,
        };
      });
    }

    case "fuel": {
      const f = {};
      if (vehicleId) f.Vehicle_num = vehicleId;
      if (vendorId) f.Vendor = vendorId;
      if (Object.keys(dateFilter).length) f.Date = dateFilter;
      const records = await Fuel.find(f).populate("Vehicle_num").populate("Vendor").populate("Fueled_by").sort({ Date: -1 });
      return records.map((r) => ({
        date: formatDate(r.Date),
        vehicle: r.Vehicle_num ? r.Vehicle_num.Vehicle_name + " (" + r.Vehicle_num.Vehicle_number + ")" : "-",
        litres: r.Litre,
        rate: r.Cost_per_litre,
        total: r.Total,
        vendor: r.Vendor ? r.Vendor.Business_name : "-",
        fueledBy: r.Fueled_by ? r.Fueled_by.name : "-",
        invoiceNo: r.Invoice_number || "-",
      }));
    }

    case "reimbursement": {
      const f = {};
      if (employeeId) f.employee = employeeId;
      if (status) f.Status = status;
      if (Object.keys(dateFilter).length) f.Date = dateFilter;
      const list = await Reimbursement.find(f).populate("employee").sort({ Date: -1 });
      return list.map((r) => ({
        date: formatDate(r.Date),
        employee: r.employee ? r.employee.name : "-",
        spentOn: r.Spent_on,
        vendor: r.Vendor || "-",
        invoiceNo: r.Invoice_number || "-",
        amount: r.Amount,
        status: r.Status,
        paidBy: r.Paid_by || "-",
      }));
    }

    case "employee": {
      const f = {};
      if (status === "active") f.isActive = true;
      if (status === "inactive") f.isActive = false;
      const list = await Employee.find(f).sort({ name: 1 });
      return list.map((e) => ({
        employeeId: e.employeeId || "-",
        name: e.name,
        department: e.department || "-",
        designation: e.designation || "-",
        employmentType: e.employmentType || "Daily Wage",
        dailyWage: e.dailyWage || 0,
        phone: e.phone || "-",
        status: e.isActive ? "Active" : "Inactive",
        joiningDate: formatDate(e.joiningDate),
      }));
    }

    case "attendance": {
      const f = {};
      if (employeeId) f.employee = employeeId;
      if (Object.keys(dateFilter).length) f.date = dateFilter;
      const list = await Attendance.find(f).populate("employee").sort({ date: -1 });
      return list.map((a) => ({
        date: formatDate(a.date),
        employee: a.employee ? a.employee.name : "-",
        status: a.status,
        eligibleDays: a.eligibleDays,
        note: a.note || "-",
      }));
    }

    case "payroll": {
      const f = {};
      if (employeeId) f.employee = employeeId;
      if (month) f.month = month;
      if (status) f.status = status;
      const list = await Payroll.find(f).populate("employee").sort({ month: -1 });
      return list.map((p) => ({
        month: p.month,
        employee: p.employee ? p.employee.name : "-",
        eligibleDays: p.totalEligibleDays,
        dailyWage: p.dailyWage,
        gross: p.grossAmount,
        advances: p.advances,
        netPayable: p.netPayable,
        paidAmount: p.paidAmount,
        remaining: Math.max(0, Math.round((p.netPayable - p.paidAmount) * 100) / 100),
        status: p.status,
      }));
    }

    case "payment": {
      const f = {};
      if (employeeId) f.employee = employeeId;
      if (Object.keys(dateFilter).length) f.paymentDate = dateFilter;
      const list = await Payment.find(f).populate("employee").populate("payroll").sort({ paymentDate: -1 });
      return list.map((pm) => ({
        date: formatDate(pm.paymentDate),
        employee: pm.employee ? pm.employee.name : "-",
        payrollMonth: pm.payroll ? pm.payroll.month : "-",
        amount: pm.amount,
        method: pm.paymentMethod,
        refNo: pm.transactionReference || "-",
        status: pm.status,
      }));
    }

    case "expense": {
      const f = {};
      if (filters.category) f.category = filters.category;
      if (Object.keys(dateFilter).length) f.date = dateFilter;
      const list = await Expense.find(f).populate("vendor").sort({ date: -1 });
      return list.map((ex) => ({
        date: formatDate(ex.date),
        category: ex.category,
        description: ex.description,
        amount: ex.amount,
        vendor: ex.vendor ? ex.vendor.Business_name : ex.personName || "-",
        reference: ex.reference || "-",
        status: ex.status,
      }));
    }

    default:
      return [];
  }
}

// GET /api/reports/data
router.get("/data", authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.status(400).json({ error: "Report type is required." });
    }

    const data = await fetchReportData(type, req.query);
    return res.json({ type, count: data.length, data });
  } catch (error) {
    console.error("Report data error:", error);
    return res.status(500).json({ error: "Failed to generate report data." });
  }
});

// GET /api/reports/export/excel
router.get("/export/excel", authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.status(400).json({ error: "Report type is required." });
    }

    const data = await fetchReportData(type, req.query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(type.toUpperCase());

    if (data.length === 0) {
      worksheet.addRow(["No data found for selected criteria"]);
    } else {
      const headers = Object.keys(data[0]);
      const headerRow = worksheet.addRow(headers.map((h) => h.toUpperCase()));
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0F2FE" },
      };

      data.forEach((row) => {
        worksheet.addRow(Object.values(row));
      });

      worksheet.columns.forEach((col) => {
        col.width = 18;
      });
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${type}_report.xlsx`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    return res.status(500).json({ error: "Failed to export Excel report." });
  }
});

// GET /api/reports/export/pdf
router.get("/export/pdf", authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.status(400).json({ error: "Report type is required." });
    }

    const data = await fetchReportData(type, req.query);

    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${type}_report.pdf`);
    doc.pipe(res);

    // Title & Header
    doc.fontSize(16).text(`${type.toUpperCase()} REPORT`, { align: "center" });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(1);

    if (data.length === 0) {
      doc.fontSize(12).text("No records found for the selected criteria.", { align: "center" });
    } else {
      const headers = Object.keys(data[0]);
      let y = doc.y;

      // Draw table headers
      doc.fontSize(8).font("Helvetica-Bold");
      const colWidth = Math.floor(760 / headers.length);
      headers.forEach((h, i) => {
        doc.text(h.toUpperCase().slice(0, 15), 30 + i * colWidth, y, { width: colWidth - 5 });
      });
      doc.moveDown(0.5);
      doc.font("Helvetica");

      data.slice(0, 200).forEach((row) => {
        if (doc.y > 520) {
          doc.addPage({ margin: 30, size: "A4", layout: "landscape" });
          y = doc.y;
        } else {
          y = doc.y;
        }
        headers.forEach((h, i) => {
          const val = String(row[h] !== undefined ? row[h] : "-");
          doc.text(val.slice(0, 20), 30 + i * colWidth, y, { width: colWidth - 5 });
        });
        doc.moveDown(0.3);
      });
    }

    doc.end();
  } catch (error) {
    console.error("PDF export error:", error);
    return res.status(500).json({ error: "Failed to export PDF report." });
  }
});

// Legacy Preserved: Investor Sheet Excel layout
const writeToExcel = require("../ohter_functions/writetoexcel");
router.post("/legacy/investor-sheet", authenticateToken, async (req, res, next) => {
  try {
    const [lots, fuels, reimbursements] = await Promise.all([
      Lot.find().populate("Vendor").populate("Items"),
      Fuel.find().populate("Vendor").populate("Vehicle_num"),
      Reimbursement.find(),
    ]);
    const data = [lots, fuels, reimbursements];
    return writeToExcel(data, res, req);
  } catch (err) {
    console.error("Investor sheet error:", err);
    return res.status(500).json({ error: "Failed to generate investor sheet." });
  }
});

// Legacy Preserved: Inventory Sheet Excel layout
const write_inventory_data = require("../ohter_functions/write_inventory_xl");
router.post("/legacy/inventory-sheet", authenticateToken, async (req, res, next) => {
  try {
    const lots = await Lot.find()
      .populate("Vendor")
      .populate({
        path: "Items",
        populate: { path: "Item_type" },
      });
    return write_inventory_data(lots, res, req);
  } catch (err) {
    console.error("Inventory sheet error:", err);
    return res.status(500).json({ error: "Failed to generate inventory sheet." });
  }
});

module.exports = router;
