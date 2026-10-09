const ExcelJS = require('exceljs');
const Lot = require('../../models/Lot');
const FuelEntry = require('../../models/FuelEntry');
const Reimbursement = require('../../models/Reimbursement');
const env = require('../../config/env');
const { fmtDate, placeBanner, placeHeader, placeRow } = require('./styles');
const { round2 } = require('../../utils/money');

const NOTE =
  'Peripheral Hardware may refer to: Mechanical Parts, 3D Printer Filament, Electronics Components, Mechanical Fabrication, Motors, Electronics Circuit Fabrication, etc -- any non-computer hardware is mentioned as peripheral hardware';
const FUEL_NOTE = 'MISCELLANEOUS (FUEL): Only those fuel receipts are mentioned for which refund is already requested or may be requested in future.';

const LOT_HEADERS = ['S NO', 'INVOICE NO.', 'INVOICE DATE', 'AMOUNT INR', 'AMOUNT USD', 'TYPE OF PRODUCT', 'BILLED TO', 'PAID BY', 'REFUND STATUS', 'PAYMENT STATUS'];
const FUEL_HEADERS = ['S_NO', 'VENDOR/COMPANY NAME', 'INVOICE NUMBER', 'INVOICE DATE', 'AMOUNT INR', 'AMOUNT USD', 'VEHICLE NUMBER', 'PAID BY', 'REFUNDED TO PERSON'];
const MISC_HEADERS = ['S_NO.', 'VENDOR/COMPANY NAME', 'INVOICE NO.', 'INVOICE DATE', 'AMOUNT INR', 'AMOUNT USD', 'TYPE OF MATERIAL', 'PAID BY'];

const inr = (n) => `₹ ${n}`;
const usd = (n) => `$ ${(n / env.company.usdRate).toFixed(2)}`;

/*
 * Same fixed layout as the original investor sheet (rows are positioned with the original formulas):
 *   rows 3-4   note banner, row 5 headers, purchases from row 6
 *   fuel banner at row 9 + purchases, 2 rows tall; headers two rows below; fuel entries follow
 *   reimbursement banner at (fuel banner row + 9 + fuel entries); "MISCELLANEOUS" two rows below it
 * Company name, default payer and USD rate come from configuration instead of being hard-coded.
 */
async function buildInvestorSheet({ from, to }) {
  const active = { isActive: { $ne: false } };
  const [lots, fuel, reimbursements] = await Promise.all([
    Lot.find({ ...active, purchaseDate: { $gte: from, $lte: to } }).sort({ purchaseDate: 1 }).lean(),
    FuelEntry.find({ ...active, date: { $gte: from, $lte: to } }).populate('vendor', 'name').populate('vehicle', 'number').populate('fueledBy', 'name').sort({ date: 1 }).lean(),
    // Approved and paid claims, as the old "reimbursement" collection held (requests and rejections were not in it).
    Reimbursement.find({ ...active, status: { $in: ['approved', 'paid'] }, date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean(),
  ]);
  const payer = env.company.defaultPaidBy;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  ws.columns = [6, 28, 20, 14, 14, 20, 25, 18, 30, 18].map((width) => ({ width }));

  placeBanner(ws, 3, 'J', NOTE, { rows: 2 });
  placeHeader(ws, 5, LOT_HEADERS);
  lots.forEach((l, i) => {
    const pct = l.totalPayable ? (l.totalPaid / l.totalPayable) * 100 : 0;
    const status = l.totalPaid === l.totalPayable ? 'Paid' : l.totalPaid === 0 ? 'Pending' : `${pct.toFixed(2)}% Paid`;
    placeRow(ws, 6 + i, [i + 1, l.invoiceNumber || '', fmtDate(l.purchaseDate), inr(l.totalPayable), usd(l.totalPayable), l.lotType || 'Computer Hardware', env.company.name, l.paidBy || payer || 'NA', '', status]);
  });

  const fuelStart = 9 + lots.length;
  placeBanner(ws, fuelStart, 'I', FUEL_NOTE, { rows: 2 });
  placeHeader(ws, fuelStart + 2, FUEL_HEADERS);
  fuel.forEach((f, i) => {
    placeRow(ws, fuelStart + 3 + i, [i + 1, f.vendor?.name || 'NA', f.invoiceNumber || 'NA', fmtDate(f.date) || 'NA', inr(f.total), usd(f.total), f.vehicle?.number || 'NA', payer || f.fueledBy?.name || 'NA', 'Not Requested/May be Requested']);
  });

  const miscStart = fuelStart + 9 + fuel.length;
  if (payer) placeBanner(ws, miscStart, 'H', `All expenses paid by ${payer} are covered by monthly average withdrawal.`);
  placeBanner(ws, miscStart + 2, 'H', 'MISCELLANEOUS', { green: true });
  placeHeader(ws, miscStart + 3, MISC_HEADERS);
  reimbursements.forEach((r, i) => {
    placeRow(ws, miscStart + 4 + i, [i + 1, r.vendorName || 'NA', r.invoiceNumber || 'NA', fmtDate(r.date), inr(r.amount), usd(r.amount), r.spentOn || 'Computer Hardware', r.paidBy || payer || 'NA']);
  });

  const totals = {
    purchases: round2(lots.reduce((s, l) => s + l.totalPayable, 0)),
    fuel: round2(fuel.reduce((s, f) => s + f.total, 0)),
    reimbursements: round2(reimbursements.reduce((s, r) => s + r.amount, 0)),
  };
  return { workbook: wb, totals };
}

module.exports = { buildInvestorSheet };
