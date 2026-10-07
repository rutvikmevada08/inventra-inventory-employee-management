const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const { request, app, setup, teardown, as, login, env } = require('./helpers');
const { runMigration } = require('../scripts/migrate-legacy');

const LEGACY_URI = 'mongodb://127.0.0.1:27017/smart_inventory_legacy_test';
const oid = () => new mongoose.Types.ObjectId();
const quiet = () => {};

const ids = { rakesh: oid(), anita: oid(), dup: oid(), noPw: oid(), bolts: oid(), rent: oid(), vendor: oid(), lotA: oid(), lotB: oid(), car: oid() };
let legacyDir, legacy, legacyCounts;

before(async () => {
  await setup();
  legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-uploads-'));
  fs.writeFileSync(path.join(legacyDir, '22-03-2024_lot_invoice.JPG'), 'lot-invoice-bytes');
  fs.writeFileSync(path.join(legacyDir, '22-03-2024_fuel_invoice.JPG'), 'fuel-invoice-bytes');

  legacy = mongoose.createConnection(LEGACY_URI);
  await legacy.asPromise();
  await legacy.dropDatabase();
  const put = (name, docs) => legacy.db.collection(name).insertMany(docs);
  const d = (s) => new Date(s);
  await put('employees', [
    { _id: ids.anita, Name: 'Anita Desai', Email: 'Anita@Company.example ', Number: 9825011122, Password: 'legacy-pass-1' },
    { _id: ids.rakesh, Name: 'Rakesh Patel', Email: 'rakesh@company.example', Number: 9898012345, Password: 'rakesh-pass' },
    { _id: ids.dup, Name: 'Rakesh P (dup)', Email: 'RAKESH@company.example' },
    { _id: ids.noPw, Name: 'Site Helper', Email: 'helper@company.example', Number: 9000000001 },
  ]);
  await put('itemtypes', [{ _id: ids.bolts, Type_name: 'Mechanical Hardware' }, { _id: ids.rent, Type_name: 'Office Rent' }]);
  await put('vendors', [{ _id: ids.vendor, Business_name: 'Shree Ganesh Electricals', Business_email: 'sales@ganesh.example', Business_contact_number: 9825012345 }]);
  await put('lots', [
    { _id: ids.lotA, Lot_type: 'Mechanical Hardware', Paid_by: 'Anita Desai', Vendor: ids.vendor, Purchase_date: d('2024-03-22'), Received: true, Invoice_number: 'SGE/221', Total_payable: 5900, Total_paid: 2000, Invoice: 'public\\uploads\\22-03-2024_lot_invoice.JPG', Description: 'Workshop bolts' },
    { _id: ids.lotB, Lot_type: 'Office Rent', Vendor: ids.vendor, Purchase_date: d('2024-04-01'), Received: false, Invoice_number: 'RENT-APR', Total_payable: 15000, Total_paid: 15000, Invoice: 'public/uploads/missing_file.png' },
  ]);
  await put('items', [
    { _id: oid(), Item_type: ids.bolts, Lot_id: ids.lotA, Cost_per_unit: 5.9, Quantity: 1000, Total_payable: 5900 },
    { _id: oid(), Item_type: ids.rent, Lot_id: ids.lotB, Cost_per_unit: 15000, Quantity: 1, Total_payable: 15000 },
    { _id: oid(), Item_type: ids.bolts, Lot_id: oid(), Cost_per_unit: 1, Quantity: 1, Total_payable: 1 }, // orphan
  ]);
  await put('item_reqs', [
    { _id: oid(), Employee: ids.rakesh, item: ids.bolts, reason: 'Fixture build', Date: d('2024-04-02'), Quantity: 50, Status: 'Accepted' },
    { _id: oid(), Employee: ids.dup, item: ids.bolts, reason: 'Spares', Date: d('2024-04-03'), Quantity: 10, Status: 'Requested' },
  ]);
  await put('reimbursements', [
    { _id: oid(), Vendor: 'NA', Invoice_number: 'NA', employee: ids.rakesh, Date: d('2024-03-21'), Amount: 450, Spent_on: 'Auto fare', Status: 'Reimbursed', Paid_by: 'Anita Desai', Invoice: 'public/uploads/21-03-2024_reimbursement_invoice.JPG' },
    { _id: oid(), Vendor: 'Reliance Digital', Invoice_number: 'RD-8891', employee: ids.anita, Date: d('2024-03-25'), Amount: 1200, Spent_on: 'Mouse and keyboard', Status: 'Pending' },
  ]);
  await put('reimbursement_reqs', [{ _id: oid(), Employee: ids.noPw, requested_amount: 300, reason: 'Courier charges', Date: d('2024-04-05'), Item: 'Parcel', Vendor: 'DTDC' }]);
  await put('vehicles', [{ _id: ids.car, Vehicle_name: 'Mahindra Bolero', Vehicle_number: 'gj06ab1234' }]);
  await put('fuels', [
    { _id: oid(), Vendor: ids.vendor, Date: d('2024-03-22'), Litre: 30, Cost_per_litre: 96.5, Total: 2895, Vehicle_num: ids.car, Fueled_by: ids.rakesh, Invoice_number: 'F-1', Invoice: 'public/uploads/22-03-2024_fuel_invoice.JPG' },
    { _id: oid(), Vendor: ids.vendor, Date: d('2024-03-23'), Litre: 10, Cost_per_litre: 96.5, Total: 965, Vehicle_num: oid(), Fueled_by: ids.rakesh, Invoice_number: 'F-2' }, // vehicle gone
  ]);

  legacyCounts = {};
  for (const c of await legacy.db.listCollections().toArray()) legacyCounts[c.name] = await legacy.db.collection(c.name).countDocuments();
});

after(async () => {
  await legacy.dropDatabase();
  await legacy.close();
  fs.rmSync(legacyDir, { recursive: true, force: true });
  await teardown();
});

const opts = (extra = {}) => ({ legacyUri: LEGACY_URI, legacyUploads: legacyDir, log: quiet, ...extra });
const countAll = async () => (await Promise.all(Object.values(mongoose.models).map((m) => m.collection.countDocuments()))).reduce((a, b) => a + b, 0);

describe('legacy migration', () => {
  test('refuses to run when source and target are the same database', async () => {
    await assert.rejects(() => runMigration(opts({ legacyUri: process.env.MONGODB_URI })), /same/);
  });

  test('dry run reports what would change and writes nothing (database or files)', async () => {
    const report = await runMigration(opts({ adminEmails: ['anita@company.example'] }));
    assert.equal(report.apply, false);
    assert.equal(report.counts.users.new, 3); // duplicate e-mail merged
    assert.equal(report.counts.lotItems.new, 2); // orphan skipped
    assert.equal(await countAll(), 0);
    assert.equal(fs.readdirSync(env.uploadDir).length, 0);
  });

  test('apply migrates every record type with the documented mapping', async () => {
    const report = await runMigration(opts({ apply: true, adminEmails: ['anita@company.example'] }));
    const User = mongoose.model('User');

    const anita = await User.findOne({ email: 'anita@company.example' }).select('+passwordHash');
    assert.equal(anita.role, 'admin');
    assert.equal(anita.phone, '9825011122');
    assert.notEqual(anita.passwordHash, 'legacy-pass-1');
    assert.match(anita.passwordHash, /^\$2[aby]\$/);
    assert.equal((await User.findOne({ email: 'helper@company.example' })).loginEnabled, false);
    assert.equal(await User.countDocuments(), 3);

    assert.equal((await mongoose.model('ItemType').findById(ids.bolts)).isStockable, true);
    assert.equal((await mongoose.model('ItemType').findById(ids.rent)).isStockable, false);

    const lotA = await mongoose.model('Lot').findById(ids.lotA);
    assert.equal(lotA.paymentStatus, 'partial');
    assert.equal(lotA.payments.length, 1);
    assert.equal(lotA.payments[0].amount, 2000);
    assert.equal(lotA.invoiceFile, '22-03-2024_lot_invoice.JPG');
    assert.equal((await mongoose.model('Lot').findById(ids.lotB)).paymentStatus, 'paid');

    // stock-in only for the received, stockable line; none for rent or the unreceived lot
    const tx = await mongoose.model('InventoryTransaction').find().lean();
    assert.equal(tx.length, 1);
    assert.equal(tx[0].quantity, 1000);
    assert.equal(String(tx[0].itemType), String(ids.bolts));

    const reqs = await mongoose.model('ItemRequest').find().lean();
    assert.deepEqual(reqs.map((r) => r.status).sort(), ['approved', 'requested']);
    assert.ok(reqs.every((r) => r.stockIssued === false));
    assert.ok(reqs.some((r) => String(r.requestedBy) === String(ids.rakesh) && String(r.requestedBy) !== String(ids.dup)));
    assert.equal(reqs.filter((r) => String(r.requestedBy) === String(ids.rakesh)).length, 2); // duplicate user merged

    const reimb = await mongoose.model('Reimbursement').find().sort({ amount: 1 }).lean();
    assert.deepEqual(reimb.map((r) => r.status), ['requested', 'paid', 'approved']);
    assert.equal(reimb.find((r) => r.amount === 450).vendorName, undefined); // "NA" dropped
    assert.equal(reimb.find((r) => r.amount === 300).spentOn, 'Courier charges (Parcel)');

    assert.equal((await mongoose.model('Vehicle').findById(ids.car)).number, 'GJ06AB1234');
    assert.equal(await mongoose.model('FuelEntry').countDocuments(), 1);

    assert.ok(report.warnings.some((w) => /duplicate e-mail/.test(w)));
    assert.ok(report.warnings.some((w) => /missing_file/.test(w)));
    assert.ok(report.warnings.some((w) => /fuel entry .* missing/.test(w)));
    assert.ok(report.warnings.some((w) => /orphan|no longer exists/.test(w)));
  });

  test('invoice files are copied with their original names and the source is untouched', () => {
    assert.equal(fs.readFileSync(path.join(env.uploadDir, '22-03-2024_lot_invoice.JPG'), 'utf8'), 'lot-invoice-bytes');
    assert.equal(fs.readFileSync(path.join(env.uploadDir, '22-03-2024_fuel_invoice.JPG'), 'utf8'), 'fuel-invoice-bytes');
    assert.equal(fs.readdirSync(legacyDir).length, 2);
  });

  test('the legacy database is left exactly as it was', async () => {
    for (const [name, n] of Object.entries(legacyCounts)) assert.equal(await legacy.db.collection(name).countDocuments(), n, name);
  });

  test('running it again adds nothing and never overwrites edits made since', async () => {
    await mongoose.model('Vendor').updateOne({ _id: ids.vendor }, { name: 'Shree Ganesh Electricals (renamed)' });
    const before = await countAll();
    const report = await runMigration(opts({ apply: true, adminEmails: ['anita@company.example'] }));
    assert.equal(await countAll(), before);
    assert.ok(Object.values(report.counts).every((c) => c.new === 0));
    assert.equal((await mongoose.model('Vendor').findById(ids.vendor)).name, 'Shree Ganesh Electricals (renamed)');
  });

  test('migrated data works through the API: old password logs in, stock and lot history are visible', async () => {
    const token = (await request(app).post('/api/auth/login').send({ email: 'anita@company.example', password: 'legacy-pass-1' })).body.data.token;
    assert.ok(token);
    assert.equal((await request(app).post('/api/auth/login').send({ email: 'helper@company.example', password: 'x'.repeat(10) })).status, 401);
    const A = as(token);
    const inv = (await A.get('/api/inventory')).body.data;
    assert.equal(inv.find((r) => r.name === 'Mechanical Hardware').balance, 1000);
    const lot = (await A.get(`/api/lots/${ids.lotA}`)).body.data;
    assert.equal(lot.balance, 3900);
    assert.equal(lot.items.length, 1);
    await A.post(`/api/lots/${ids.lotA}/mark-clear`, {});
    assert.equal((await A.get(`/api/lots/${ids.lotA}`)).body.data.payments.length, 2);
    // a migrated lot with stock-in can be reversed cleanly (lot has payments so it is refused)
    assert.equal((await A.del(`/api/lots/${ids.lotA}`)).status, 409);
    // staff approved request from before the ledger can still be listed
    const staffTok = as(await login({ email: 'rakesh@company.example' }, 'rakesh-pass'));
    assert.equal((await staffTok.get('/api/item-requests')).body.data.length, 2);
  });
});
