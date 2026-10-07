process.env.DEFAULT_PAID_BY = 'Anita Desai';
process.env.COMPANY_NAME = 'Demo Company';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown } = require('./helpers');
const Lot = require('../models/Lot');
const FuelEntry = require('../models/FuelEntry');
const Reimbursement = require('../models/Reimbursement');
const Vendor = require('../models/Vendor');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { buildInvestorSheet } = require('../services/exports/investorSheet');

const range = { from: new Date('2026-09-01'), to: new Date('2026-09-30T23:59:59') };
const row = (ws, n) => ws.getRow(n).values.slice(1);

before(setup);
after(teardown);

test('empty range keeps the original row positions', async () => {
  const { workbook } = await buildInvestorSheet({ from: new Date('2030-01-01'), to: new Date('2030-01-31') });
  const ws = workbook.getWorksheet('Data');
  assert.match(ws.getCell('A3').value, /^Peripheral Hardware may refer to/);
  assert.equal(row(ws, 5)[0], 'S NO');
  assert.match(ws.getCell('A9').value, /^MISCELLANEOUS \(FUEL\)/); // 9 + 0 purchases
  assert.equal(ws.getCell('A18').value.startsWith('All expenses paid by Anita Desai'), true); // 9 + 9 + 0 fuel
  assert.equal(ws.getCell('A20').value, 'MISCELLANEOUS');
});

test('populated sheet follows the original structure, headers and row formulas', async () => {
  const vendor = await Vendor.create({ name: 'Shree Ganesh Electricals' });
  const vehicle = await Vehicle.create({ name: 'Bolero', number: 'GJ06AB1234' });
  const user = await User.create({ name: 'Rakesh Patel', email: 'r@example.com' });
  await Lot.create([
    { vendor: vendor._id, purchaseDate: new Date('2026-09-10'), invoiceNumber: 'INV-1', totalPayable: 5000 },
    { vendor: vendor._id, purchaseDate: new Date('2026-09-12'), invoiceNumber: 'INV-2', lotType: 'Mechanical Hardware', paidBy: 'Rakesh Patel', totalPayable: 2000, totalPaid: 500 },
  ]);
  await FuelEntry.create({ vendor: vendor._id, vehicle: vehicle._id, date: new Date('2026-09-15'), litres: 10, costPerLitre: 95, total: 950, fueledBy: user._id, invoiceNumber: 'IOC-1' });
  await Reimbursement.create({ claimant: user._id, date: new Date('2026-09-16'), amount: 640, spentOn: 'Auto fare', vendorName: 'City Autos', status: 'paid' });
  await Reimbursement.create({ claimant: user._id, date: new Date('2026-09-17'), amount: 111, spentOn: 'Only requested', status: 'requested' });

  const { workbook, totals } = await buildInvestorSheet(range);
  const ws = workbook.getWorksheet('Data');

  // purchases: banner rows 3-4 merged A:J, headers row 5, data from row 6
  assert.equal(ws.getCell('J4').master.address, 'A3');
  assert.deepEqual(row(ws, 5), ['S NO', 'INVOICE NO.', 'INVOICE DATE', 'AMOUNT INR', 'AMOUNT USD', 'TYPE OF PRODUCT', 'BILLED TO', 'PAID BY', 'REFUND STATUS', 'PAYMENT STATUS']);
  assert.deepEqual(row(ws, 6), [1, 'INV-1', '10-09-2026', '₹ 5000', `$ ${(5000 / 73.7).toFixed(2)}`, 'Computer Hardware', 'Demo Company', 'Anita Desai', '', 'Pending']);
  assert.deepEqual(row(ws, 7), [2, 'INV-2', '12-09-2026', '₹ 2000', `$ ${(2000 / 73.7).toFixed(2)}`, 'Mechanical Hardware', 'Demo Company', 'Rakesh Patel', '', '25.00% Paid']);

  // fuel: banner at 9 + 2 purchases = 11 (2 rows tall, A:I), headers at 13, entry at 14
  assert.match(ws.getCell('A11').value, /^MISCELLANEOUS \(FUEL\)/);
  assert.equal(ws.getCell('I12').master.address, 'A11');
  assert.deepEqual(row(ws, 13), ['S_NO', 'VENDOR/COMPANY NAME', 'INVOICE NUMBER', 'INVOICE DATE', 'AMOUNT INR', 'AMOUNT USD', 'VEHICLE NUMBER', 'PAID BY', 'REFUNDED TO PERSON']);
  assert.deepEqual(row(ws, 14).slice(0, 5), [1, 'Shree Ganesh Electricals', 'IOC-1', '15-09-2026', '₹ 950']);
  assert.equal(row(ws, 14)[6], 'GJ06AB1234');

  // miscellaneous: banner at 11 + 9 + 1 fuel = 21, label two rows below, 8 header columns, entry from row 25
  assert.equal(ws.getCell('A21').value, 'All expenses paid by Anita Desai are covered by monthly average withdrawal.');
  assert.equal(ws.getCell('A23').value, 'MISCELLANEOUS');
  assert.deepEqual(row(ws, 24), ['S_NO.', 'VENDOR/COMPANY NAME', 'INVOICE NO.', 'INVOICE DATE', 'AMOUNT INR', 'AMOUNT USD', 'TYPE OF MATERIAL', 'PAID BY']);
  assert.deepEqual(row(ws, 25).slice(0, 7), [1, 'City Autos', 'NA', '16-09-2026', '₹ 640', `$ ${(640 / 73.7).toFixed(2)}`, 'Auto fare']);
  assert.equal(ws.getRow(26).values.slice(1).length, 0); // the merely-requested claim is not listed

  assert.deepEqual([6, 28, 20, 14, 14, 20, 25, 18, 30, 18], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => ws.getColumn(c).width));
  assert.deepEqual(totals, { purchases: 7000, fuel: 950, reimbursements: 640 });
});
