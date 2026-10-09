const ExcelJS = require('exceljs');
const Lot = require('../../models/Lot');
const LotItem = require('../../models/LotItem');
const { fmtDate, banner, headerRow, dataRow } = require('./styles');
const { round2 } = require('../../utils/money');

// One block per purchase lot: the lot row, its line items, then a total, like the original export.
async function buildInventorySheet({ from, to }) {
  const lots = await Lot.find({ isActive: { $ne: false }, purchaseDate: { $gte: from, $lte: to } }).populate('vendor', 'name').sort({ purchaseDate: 1 }).lean();
  const lines = await LotItem.find({ lot: { $in: lots.map((l) => l._id) } }).populate('itemType', 'name').lean();
  const byLot = new Map();
  lines.forEach((li) => byLot.set(String(li.lot), [...(byLot.get(String(li.lot)) || []), li]));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  ws.columns = [6, 28, 20, 20, 24, 16, 12, 16, 30].map((width) => ({ width }));
  ws.addRows([[], []]);
  banner(ws, 'Inventory purchases', 'I');
  headerRow(ws, ['S NO', 'INVOICE NO.', 'PURCHASE DATE', 'VENDOR', 'ITEM', 'COST PER UNIT', 'QUANTITY', 'AMOUNT', 'PURPOSE']);

  lots.forEach((lot, i) => {
    dataRow(ws, [i + 1, lot.invoiceNumber, fmtDate(lot.purchaseDate), lot.vendor?.name || '', '', '', '', '', lot.description || lot.lotType || '']);
    const items = byLot.get(String(lot._id)) || [];
    items.forEach((it) => dataRow(ws, ['', '', '', '', it.itemType?.name || '', it.costPerUnit, it.quantity, it.totalPayable]));
    dataRow(ws, ['', '', '', '', '', '', 'Total', round2(items.reduce((s, it) => s + it.totalPayable, 0))], true);
  });
  return { workbook: wb, lotCount: lots.length };
}

module.exports = { buildInventorySheet };
