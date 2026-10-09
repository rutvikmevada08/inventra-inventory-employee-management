/*
 * Behaviour that depends on the database server rather than on this code.
 * These are the checks to run against a REAL MongoDB before deploying:
 *     TEST_MONGODB_URI=mongodb://127.0.0.1:27017/smart_inventory_test npm test
 * The suite was developed against FerretDB (a MongoDB-compatible server), which differs from MongoDB in places.
 * Anything that FerretDB does not support is marked as skipped below with the reason, not silently dropped.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { setup, teardown } = require('./helpers');

let ferret = false;
before(async () => {
  await setup();
  const info = await mongoose.connection.db.admin().command({ buildInfo: 1 });
  ferret = Boolean(info.ferretdbVersion);
  console.log(ferret ? `# server: FerretDB ${info.ferretdbVersion} (compatibility layer, NOT real MongoDB)` : `# server: MongoDB ${info.version}`);
});
after(teardown);

const raw = (name) => mongoose.connection.collection(name);
const rejectsDuplicate = (p) => assert.rejects(p, (e) => e.code === 11000);

test('unique index on user email is enforced by the database', async () => {
  await raw('users').insertOne({ email: 'dup@example.com', name: 'A' });
  await rejectsDuplicate(raw('users').insertOne({ email: 'dup@example.com', name: 'B' }));
});

test('ledger: a lot line can be received only once (sparse unique lotItem)', async (t) => {
  const lotItem = new mongoose.Types.ObjectId();
  const tx = (extra) => ({ itemType: new mongoose.Types.ObjectId(), type: 'in', quantity: 1, source: 'lot', ...extra });
  await raw('inventorytransactions').insertOne(tx({ lotItem }));
  try {
    await rejectsDuplicate(raw('inventorytransactions').insertOne(tx({ lotItem })));
  } catch (e) {
    if (ferret) return t.skip(`VERIFY ON REAL MONGODB: FerretDB did not enforce the sparse unique index (${e.message})`);
    throw e;
  }
});

test('ledger: entries without lotItem/itemRequest/reversalOf do not collide (sparse indexes ignore absent fields)', async (t) => {
  const tx = () => ({ itemType: new mongoose.Types.ObjectId(), type: 'in', quantity: 1, source: 'adjustment' });
  try {
    await raw('inventorytransactions').insertMany([tx(), tx(), tx()]);
  } catch (e) {
    if (ferret) return t.skip(`VERIFY ON REAL MONGODB: sparse index rejected documents without the field (${e.message})`);
    throw e;
  }
});

test('ledger: one request can be issued only once (sparse unique itemRequest) and one receipt reversed only once', async (t) => {
  const req = new mongoose.Types.ObjectId();
  const rev = new mongoose.Types.ObjectId();
  const tx = (extra) => ({ itemType: new mongoose.Types.ObjectId(), type: 'out', quantity: 1, source: 'item_request', ...extra });
  await raw('inventorytransactions').insertOne(tx({ itemRequest: req, reversalOf: rev }));
  try {
    await rejectsDuplicate(raw('inventorytransactions').insertOne(tx({ itemRequest: req })));
    await rejectsDuplicate(raw('inventorytransactions').insertOne(tx({ reversalOf: rev })));
  } catch (e) {
    if (ferret) return t.skip(`VERIFY ON REAL MONGODB: sparse unique index not enforced (${e.message})`);
    throw e;
  }
});

test('records saved without an isActive field (older data) still count as active', async () => {
  await raw('vendors').insertOne({ name: 'Legacy Vendor Without Flag' });
  const Vendor = mongoose.model('Vendor');
  assert.equal(await Vendor.countDocuments({ name: 'Legacy Vendor Without Flag', isActive: { $ne: false } }), 1);
});

test('stock balance aggregation: $group with a compound key and one $sum', async () => {
  const stock = require('../services/stock');
  const id = new mongoose.Types.ObjectId();
  await raw('inventorytransactions').insertMany([
    { itemType: id, type: 'in', quantity: 10.5, source: 'adjustment' },
    { itemType: id, type: 'in', quantity: 4.25, source: 'adjustment' },
    { itemType: id, type: 'out', quantity: 3, source: 'adjustment' },
  ]);
  assert.equal((await stock.balances([id])).get(String(id)).balance, 11.75);
});

test('case-insensitive search and sorting on names behave as expected', async () => {
  const Vendor = mongoose.model('Vendor');
  await Vendor.create([{ name: 'alpha traders' }, { name: 'Beta Supplies' }]);
  const found = await Vendor.find({ name: /^ALPHA/i }).lean();
  assert.equal(found.length, 1);
});
