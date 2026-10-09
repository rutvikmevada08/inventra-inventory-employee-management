const { buildInvestorSheet } = require('../services/exports/investorSheet');
const { buildInventorySheet } = require('../services/exports/inventorySheet');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { fmtDate } = require('../services/exports/styles');

function readRange(query) {
  const from = new Date(query.from);
  const to = new Date(query.to);
  if (isNaN(from) || isNaN(to)) throw new ApiError(400, 'Both from and to dates are required');
  if (from > to) throw new ApiError(400, 'The from date must be before the to date');
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

async function send(res, workbook, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

exports.investorSheet = asyncHandler(async (req, res) => {
  const { workbook } = await buildInvestorSheet(readRange(req.query));
  await send(res, workbook, 'Investor_sheet.xlsx');
});

exports.inventorySheet = asyncHandler(async (req, res) => {
  const { workbook } = await buildInventorySheet(readRange(req.query));
  await send(res, workbook, `${fmtDate(new Date())}_Inventory_sheet.xlsx`);
});
