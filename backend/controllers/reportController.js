const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const Advance = require('../models/Advance');
const Payment = require('../models/Payment');
const Lot = require('../models/Lot');
const LotItem = require('../models/LotItem');
const ItemType = require('../models/ItemType');
const InventoryTransaction = require('../models/InventoryTransaction');
const Vendor = require('../models/Vendor');
const Vehicle = require('../models/Vehicle');
const FuelEntry = require('../models/FuelEntry');
const Reimbursement = require('../models/Reimbursement');
const Expense = require('../models/Expense');
const stock = require('../services/stock');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildInventorySheet } = require('../services/exports/inventorySheet');
const { buildInvestorSheet } = require('../services/exports/investorSheet');
const { round2 } = require('../utils/money');

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
}

async function fetchReportData(type, filters = {}) {
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
    case 'inventory': {
      const types = await ItemType.find({ isActive: { $ne: false } }).lean();
      const bal = await stock.balances(types.map((t) => t._id));
      return types.map((it) => {
        const b = bal.get(String(it._id)) || { balance: 0, in: 0, out: 0, value: 0 };
        return {
          itemName: it.name,
          category: it.isStockable ? 'Stockable' : 'Service',
          unit: it.unit || 'pcs',
          inStock: b.balance,
          totalReceived: b.in || 0,
          totalIssued: b.out || 0,
          totalValue: round2(b.value || 0),
        };
      });
    }

    case 'stock-movement': {
      const f = {};
      if (itemTypeId) f.itemType = itemTypeId;
      if (Object.keys(dateFilter).length) f.date = dateFilter;
      const txs = await InventoryTransaction.find(f)
        .populate('itemType', 'name unit')
        .populate('createdBy', 'name')
        .sort({ date: -1, createdAt: -1 });
      return txs.map((t) => ({
        date: formatDate(t.date || t.createdAt),
        itemName: t.itemType ? t.itemType.name : '-',
        type: t.type === 'in' ? 'STOCK_IN' : 'STOCK_OUT',
        quantity: t.quantity,
        unitCost: t.costPerUnit || 0,
        totalCost: t.totalCost || round2(t.quantity * (t.costPerUnit || 0)),
        source: t.source || '-',
        notes: t.note || '-',
      }));
    }

    case 'purchase': {
      const f = { isActive: { $ne: false } };
      if (vendorId) f.vendor = vendorId;
      if (Object.keys(dateFilter).length) f.purchaseDate = dateFilter;
      const lots = await Lot.find(f).populate('vendor', 'name').sort({ purchaseDate: -1 });
      return lots.map((l) => ({
        invoiceNo: l.invoiceNumber,
        date: formatDate(l.purchaseDate),
        vendor: l.vendor ? l.vendor.name : '-',
        totalPayable: l.totalPayable,
        totalPaid: l.totalPaid,
        balance: round2(Math.max(0, l.totalPayable - l.totalPaid)),
        status: l.totalPaid >= l.totalPayable ? 'Paid' : l.totalPaid > 0 ? 'Partially Paid' : 'Unpaid',
        received: l.received ? 'Yes' : 'No',
      }));
    }

    case 'vendor': {
      const vendors = await Vendor.find({ isActive: { $ne: false } }).sort({ name: 1 });
      const [lots, fuels] = await Promise.all([
        Lot.find({ isActive: { $ne: false } }),
        FuelEntry.find({ isActive: { $ne: false } }),
      ]);
      return vendors.map((v) => {
        const vLots = lots.filter((l) => l.vendor && l.vendor.toString() === v._id.toString());
        const vFuels = fuels.filter((f) => f.vendor && f.vendor.toString() === v._id.toString());
        const totalPayable = vLots.reduce((sum, l) => sum + (l.totalPayable || 0), 0);
        const totalPaid = vLots.reduce((sum, l) => sum + (l.totalPaid || 0), 0);
        const fuelSpent = vFuels.reduce((sum, f) => sum + (f.total || 0), 0);
        return {
          vendorName: v.name,
          contact: v.phone || '-',
          email: v.email || '-',
          totalLots: vLots.length,
          lotAmount: round2(totalPayable),
          paidAmount: round2(totalPaid),
          pendingBalance: round2(Math.max(0, totalPayable - totalPaid)),
          fuelSpent: round2(fuelSpent),
        };
      });
    }

    case 'fuel': {
      const f = { isActive: { $ne: false } };
      if (vehicleId) f.vehicle = vehicleId;
      if (vendorId) f.vendor = vendorId;
      if (Object.keys(dateFilter).length) f.date = dateFilter;
      const records = await FuelEntry.find(f)
        .populate('vehicle', 'name number')
        .populate('vendor', 'name')
        .populate('fueledBy', 'name')
        .sort({ date: -1 });
      return records.map((r) => ({
        date: formatDate(r.date),
        vehicle: r.vehicle ? `${r.vehicle.name} (${r.vehicle.number})` : '-',
        litres: r.litres,
        rate: r.costPerLitre,
        total: r.total,
        vendor: r.vendor ? r.vendor.name : '-',
        fueledBy: r.fueledBy ? r.fueledBy.name : '-',
        invoiceNo: r.invoiceNumber || '-',
      }));
    }

    case 'reimbursement': {
      const f = { isActive: { $ne: false } };
      if (employeeId) f.claimant = employeeId;
      if (status) f.status = status;
      if (Object.keys(dateFilter).length) f.spentDate = dateFilter;
      const list = await Reimbursement.find(f).populate('claimant', 'name').sort({ spentDate: -1, createdAt: -1 });
      return list.map((r) => ({
        date: formatDate(r.spentDate || r.createdAt),
        employee: r.claimant ? r.claimant.name : '-',
        spentOn: r.spentOn,
        vendor: r.vendor || '-',
        invoiceNo: r.invoiceNumber || '-',
        amount: r.amount,
        status: r.status,
        paidBy: r.paidBy || '-',
      }));
    }

    case 'employee': {
      const f = {};
      if (status === 'active') f.isActive = { $ne: false };
      if (status === 'inactive') f.isActive = false;
      const list = await Employee.find(f).sort({ name: 1 });
      return list.map((e) => ({
        employeeId: e.employeeId || '-',
        name: e.name,
        department: e.department || '-',
        designation: e.designation || '-',
        employmentType: e.employmentType || 'Daily Wage',
        dailyWage: e.dailyWage || 0,
        phone: e.phone || '-',
        status: e.isActive !== false ? 'Active' : 'Inactive',
        joiningDate: formatDate(e.joiningDate),
      }));
    }

    case 'attendance': {
      const f = {};
      if (employeeId) f.employee = employeeId;
      if (Object.keys(dateFilter).length) f.date = dateFilter;
      const list = await Attendance.find(f).populate('employee', 'name').sort({ date: -1 });
      return list.map((a) => ({
        date: formatDate(a.date),
        employee: a.employee ? a.employee.name : '-',
        status: a.status,
        eligibleDays: a.eligibleDays,
        note: a.note || '-',
      }));
    }

    case 'payroll': {
      const f = {};
      if (employeeId) f.employee = employeeId;
      if (month) f.month = month;
      if (status) f.status = status;
      const list = await Payroll.find(f).populate('employee', 'name').sort({ month: -1 });
      return list.map((p) => ({
        month: p.month,
        employee: p.employee ? p.employee.name : '-',
        eligibleDays: p.totalEligibleDays,
        dailyWage: p.dailyWage,
        gross: p.grossAmount,
        advances: p.advances,
        netPayable: p.netPayable,
        paidAmount: p.paidAmount,
        remaining: round2(Math.max(0, p.netPayable - p.paidAmount)),
        status: p.status,
      }));
    }

    case 'payment': {
      const f = {};
      if (employeeId) f.employee = employeeId;
      if (Object.keys(dateFilter).length) f.paymentDate = dateFilter;
      const list = await Payment.find(f).populate('employee', 'name').populate('payroll', 'month').sort({ paymentDate: -1 });
      return list.map((pm) => ({
        date: formatDate(pm.paymentDate),
        employee: pm.employee ? pm.employee.name : '-',
        payrollMonth: pm.payroll ? pm.payroll.month : '-',
        amount: pm.amount,
        method: pm.paymentMethod,
        refNo: pm.transactionReference || '-',
        status: pm.status,
      }));
    }

    case 'expense': {
      const f = {};
      if (filters.category) f.category = filters.category;
      if (Object.keys(dateFilter).length) f.date = dateFilter;
      const list = await Expense.find(f).populate('vendor', 'name').sort({ date: -1 });
      return list.map((ex) => ({
        date: formatDate(ex.date),
        category: ex.category,
        description: ex.description,
        amount: ex.amount,
        vendor: ex.vendor ? ex.vendor.name : ex.personName || '-',
        reference: ex.reference || '-',
        status: ex.status,
      }));
    }

    default:
      return [];
  }
}

exports.data = asyncHandler(async (req, res) => {
  const { type } = req.query;
  if (!type) throw new ApiError(400, 'Report type is required.');

  const data = await fetchReportData(type, req.query);
  res.status(200).json({ success: true, type, count: data.length, data, rows: data });
});

exports.exportExcel = asyncHandler(async (req, res) => {
  const { type } = req.query;
  if (!type) throw new ApiError(400, 'Report type is required.');

  const data = await fetchReportData(type, req.query);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type.toUpperCase());

  if (data.length === 0) {
    worksheet.addRow(['No data found for selected criteria']);
  } else {
    const headers = Object.keys(data[0]);
    const headerRow = worksheet.addRow(headers.map((h) => h.toUpperCase()));
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0F2FE' },
    };

    data.forEach((row) => {
      worksheet.addRow(Object.values(row));
    });

    worksheet.columns.forEach((col) => {
      col.width = 18;
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${type}_report.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

exports.exportPdf = asyncHandler(async (req, res) => {
  const { type } = req.query;
  if (!type) throw new ApiError(400, 'Report type is required.');

  const data = await fetchReportData(type, req.query);
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${type}_report.pdf`);
  doc.pipe(res);

  doc.fontSize(16).text(`${type.toUpperCase()} REPORT`, { align: 'center' });
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1);

  if (data.length === 0) {
    doc.fontSize(12).text('No records found for the selected criteria.', { align: 'center' });
  } else {
    const headers = Object.keys(data[0]);
    let y = doc.y;

    doc.fontSize(8).font('Helvetica-Bold');
    const colWidth = Math.floor(760 / headers.length);
    headers.forEach((h, i) => {
      doc.text(h.toUpperCase().slice(0, 15), 30 + i * colWidth, y, { width: colWidth - 5 });
    });
    doc.moveDown(0.5);
    doc.font('Helvetica');

    data.slice(0, 200).forEach((row) => {
      if (doc.y > 520) {
        doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
        y = doc.y;
      } else {
        y = doc.y;
      }
      headers.forEach((h, i) => {
        const val = String(row[h] !== undefined ? row[h] : '-');
        doc.text(val.slice(0, 20), 30 + i * colWidth, y, { width: colWidth - 5 });
      });
      doc.moveDown(0.3);
    });
  }

  doc.end();
});

exports.legacyInventorySheet = asyncHandler(async (req, res) => {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  const { workbook } = await buildInventorySheet({ from, to });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Inventory_sheet.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

exports.legacyInvestorSheet = asyncHandler(async (req, res) => {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  const { workbook } = await buildInvestorSheet({ from, to });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Investor_sheet.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

exports.investorSheet = exports.legacyInvestorSheet;
exports.inventorySheet = exports.legacyInventorySheet;

