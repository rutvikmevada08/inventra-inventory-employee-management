const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, makeUser, login, as } = require('./helpers');

let A, S, vendorA, vendorB, bolts, rent;
const lot = (body, items) => A.raw('post', '/api/lots').field('items', JSON.stringify(items)).field('vendor', body.vendor).field('purchaseDate', body.date).field('invoiceNumber', body.inv)
  .field('received', String(Boolean(body.received))).field('totalPaid', String(body.paid || 0));

before(async () => {
  await setup();
  A = as(await login(await makeUser({ role: 'admin' })));
  S = as(await login(await makeUser()));
  vendorA = (await A.post('/api/vendors', { name: 'Shree Ganesh Electricals' })).body.data;
  vendorB = (await A.post('/api/vendors', { name: 'Patel Hardware Mart' })).body.data;
  bolts = (await A.post('/api/item-types', { name: 'M8 Hex Bolts', reorderLevel: 10 })).body.data;
  rent = (await A.post('/api/item-types', { name: 'Office Rent', isStockable: false })).body.data;
  await lot({ vendor: vendorA._id, date: '2026-08-05', inv: 'A-1', received: true, paid: 1000 }, [{ itemType: bolts._id, quantity: 100, costPerUnit: 10 }]); // paid in full
  await lot({ vendor: vendorA._id, date: '2026-09-05', inv: 'A-2', paid: 500 }, [{ itemType: bolts._id, quantity: 50, costPerUnit: 20 }]); // partial
  await lot({ vendor: vendorB._id, date: '2026-09-20', inv: 'B-7' }, [{ itemType: rent._id, quantity: 1, costPerUnit: 15000 }]); // unpaid
});
after(teardown);

test('lot list filters by vendor, payment status, received, invoice search and dates', async () => {
  const names = async (qs) => (await A.get(`/api/lots?${qs}`)).body.data.map((l) => l.invoiceNumber).sort();
  assert.deepEqual(await names(''), ['A-1', 'A-2', 'B-7']);
  assert.deepEqual(await names(`vendor=${vendorA._id}`), ['A-1', 'A-2']);
  assert.deepEqual(await names('paymentStatus=paid'), ['A-1']);
  assert.deepEqual(await names('paymentStatus=partial'), ['A-2']);
  assert.deepEqual(await names('paymentStatus=unpaid'), ['B-7']);
  assert.deepEqual(await names('received=true'), ['A-1']);
  assert.deepEqual(await names('q=b-'), ['B-7']);
  assert.deepEqual(await names('from=2026-09-01&to=2026-09-30'), ['A-2', 'B-7']);
});

test('lot list sorts and paginates', async () => {
  const byAmount = (await A.get('/api/lots?sort=amount')).body.data.map((l) => l.invoiceNumber);
  assert.deepEqual(byAmount, ['B-7', 'A-1', 'A-2']);
  const p = (await A.get('/api/lots?limit=2&page=2')).body;
  assert.equal(p.data.length, 1);
  assert.equal(p.meta.total, 3);
  assert.equal(p.meta.pages, 2);
});

test('lot detail returns lines, payments and stock movements; the list includes the vendor name', async () => {
  const list = (await A.get('/api/lots?q=A-1')).body.data[0];
  assert.equal(list.vendor.name, 'Shree Ganesh Electricals');
  const d = (await A.get(`/api/lots/${list._id}`)).body.data;
  assert.equal(d.items[0].itemType.name, 'M8 Hex Bolts');
  assert.equal(d.payments.length, 1);
  assert.equal(d.movements.length, 1);
  assert.equal(d.balance, 0);
});

test('a deactivated item type cannot be used on a new purchase', async () => {
  const t = (await A.post('/api/item-types', { name: 'Obsolete Part' })).body.data;
  await A.del(`/api/item-types/${t._id}`);
  const res = await lot({ vendor: vendorA._id, date: '2026-09-25', inv: 'A-9' }, [{ itemType: t._id, quantity: 1, costPerUnit: 1 }]);
  assert.equal(res.status, 400);
  assert.match(res.body.message, /deactivated/);
});

test('vendor summary adds up purchases, payments and what is outstanding', async () => {
  const s = (await A.get(`/api/vendors/${vendorA._id}/summary`)).body.data;
  assert.equal(s.lotCount, 2);
  assert.equal(s.totalPurchased, 2000);
  assert.equal(s.totalPaid, 1500);
  assert.equal(s.outstanding, 500);
  assert.equal((await S.get(`/api/vendors/${vendorA._id}/summary`)).status, 403);
});

test('item types: editing keeps history; deactivating hides them from stock and request forms', async () => {
  const upd = await A.put(`/api/item-types/${bolts._id}`, { reorderLevel: 500, unit: 'nos' });
  assert.equal(upd.body.data.reorderLevel, 500);
  const stock = (await A.get('/api/inventory')).body.data.find((r) => r._id === bolts._id);
  assert.equal(stock.lowStock, true); // 100 on hand, below the new level of 500
  assert.equal((await A.post('/api/item-types', { name: 'm8 hex bolts' })).status, 409);
});
