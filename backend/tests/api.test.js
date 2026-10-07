const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const { app, request, setup, teardown, makeUser, login, as, env } = require('./helpers');
const InventoryTransaction = require('../models/InventoryTransaction');

let admin, staff, staff2, A, S, S2;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

before(async () => {
  await setup();
  admin = await makeUser({ name: 'Anita Desai', role: 'admin' });
  staff = await makeUser({ name: 'Rakesh Patel' });
  staff2 = await makeUser({ name: 'Meena Joshi' });
  [A, S, S2] = [as(await login(admin)), as(await login(staff)), as(await login(staff2))];
});
after(teardown);

describe('authentication', () => {
  test('rejects wrong password and unknown email with the same message', async () => {
    const bad = await request(app).post('/api/auth/login').send({ email: admin.email, password: 'wrongpass1' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrongpass1' });
    assert.equal(bad.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(bad.body.message, unknown.body.message);
  });

  test('login returns a token and never the password hash', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: admin.email, password: 'password123' });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.passwordHash, undefined);
    assert.equal(JSON.stringify(res.body).includes('$2'), false);
  });

  test('protected routes need a valid token', async () => {
    assert.equal((await request(app).get('/api/vendors')).status, 401);
    assert.equal((await request(app).get('/api/vendors').set('Authorization', 'Bearer abc.def.ghi')).status, 401);
  });

  test('the old admin_id cookie no longer grants access', async () => {
    const res = await request(app).get('/api/lots').set('Cookie', `admin_id=${admin.email}`);
    assert.equal(res.status, 401);
  });

  test('staff cannot reach admin routes', async () => {
    assert.equal((await S.get('/api/lots')).status, 403);
    assert.equal((await S.get('/api/users')).status, 403);
    assert.equal((await S.post('/api/vendors', { name: 'X' })).status, 403);
  });

  test('a user without a password cannot log in, and deactivated users are cut off immediately', async () => {
    const noPw = await mongoose.model('User').create({ name: 'Old Record', email: 'old@example.com' });
    assert.equal((await request(app).post('/api/auth/login').send({ email: noPw.email, password: 'anything123' })).status, 401);

    const temp = await makeUser();
    const t = as(await login(temp));
    assert.equal((await t.get('/api/auth/me')).status, 200);
    await A.del(`/api/users/${temp.id}`);
    assert.equal((await t.get('/api/auth/me')).status, 401);
    assert.equal((await request(app).post('/api/auth/login').send({ email: temp.email, password: 'password123' })).status, 401);
  });

  test('the last admin cannot be deactivated or demoted; passwords need 8 characters', async () => {
    assert.equal((await A.del(`/api/users/${admin.id}`)).status, 409);
    assert.equal((await A.post('/api/users', { name: 'Short', email: 'short@example.com', password: '123' })).status, 400);
  });
});

describe('vendors and lookups', () => {
  let vendorId;
  test('create, reject duplicate name, update', async () => {
    const res = await A.post('/api/vendors', { name: 'Shree Ganesh Electricals', phone: '9825012345', email: 'sales@ganesh.example', role: 'hacker' });
    assert.equal(res.status, 201);
    vendorId = res.body.data._id;
    assert.equal((await A.post('/api/vendors', { name: 'shree ganesh electricals' })).status, 409);
    assert.equal((await A.put(`/api/vendors/${vendorId}`, { contactPerson: 'Dilip Shah' })).body.data.contactPerson, 'Dilip Shah');
    assert.equal((await A.post('/api/vendors', { name: 'Bad Email', email: 'nope' })).status, 400);
  });

  test('staff can read but not write; deactivation hides it without deleting it', async () => {
    assert.equal((await S.get('/api/vendors')).body.data.length, 1);
    assert.equal((await A.del(`/api/vendors/${vendorId}`)).status, 200);
    assert.equal((await A.get('/api/vendors')).body.data.length, 0);
    assert.equal((await A.get('/api/vendors?status=inactive')).body.data.length, 1);
    await A.post(`/api/vendors/${vendorId}/reactivate`);
    assert.equal((await A.get('/api/vendors')).body.data.length, 1);
  });

  test('invalid ids return 400, missing records 404', async () => {
    assert.equal((await A.get('/api/vendors/not-an-id')).status, 400);
    assert.equal((await A.get(`/api/vendors/${new mongoose.Types.ObjectId()}`)).status, 404);
  });
});

describe('inventory: lots, stock ledger and payments', () => {
  let vendor, bolts, cable, rent, lot1;
  const stockOf = async (id) => (await A.get('/api/inventory')).body.data.find((r) => r._id === id)?.balance;

  before(async () => {
    vendor = (await A.post('/api/vendors', { name: 'Patel Hardware Mart' })).body.data;
    bolts = (await A.post('/api/item-types', { name: 'M8 Hex Bolts', unit: 'pcs', reorderLevel: 50 })).body.data;
    cable = (await A.post('/api/item-types', { name: 'Copper Cable 2.5 sq mm', unit: 'm', reorderLevel: 10 })).body.data;
    rent = (await A.post('/api/item-types', { name: 'Office Rent', isStockable: false })).body.data;
  });

  const lotRequest = (fields, items, file = true) => {
    let r = A.raw('post', '/api/lots');
    Object.entries(fields).forEach(([k, v]) => { r = r.field(k, String(v)); });
    r = r.field('items', JSON.stringify(items));
    return file ? r.attach('invoice', png, 'bill.png') : r;
  };

  test('line totals are calculated by the backend; received lot creates stock-in; services do not', async () => {
    const res = await lotRequest(
      { vendor: vendor._id, purchaseDate: '2026-09-10', invoiceNumber: 'PH/2026/118', received: true, totalPaid: 0 },
      [
        { itemType: bolts._id, quantity: 200, costPerUnit: 4.5, totalPayable: 1 },
        { itemType: cable._id, quantity: 30, costPerUnit: 82 },
        { itemType: rent._id, quantity: 1, costPerUnit: 15000 },
      ]
    );
    assert.equal(res.status, 201, JSON.stringify(res.body));
    lot1 = res.body.data;
    assert.equal(lot1.totalPayable, 200 * 4.5 + 30 * 82 + 15000);
    const detail = (await A.get(`/api/lots/${lot1._id}`)).body.data;
    assert.equal(detail.items.find((i) => i.itemType._id === bolts._id).totalPayable, 900);
    assert.equal(detail.movements.length, 2); // rent is not stockable
    assert.equal(await stockOf(bolts._id), 200);
    assert.equal(await stockOf(cable._id), 30);
    assert.equal(await stockOf(rent._id), undefined);
  });

  test('uploaded invoice gets a unique name and is only served to signed-in users', async () => {
    assert.match(lot1.invoiceFile, /^\d+-[0-9a-f]{12}\.png$/);
    assert.equal((await request(app).get(`/api/files/${lot1.invoiceFile}`)).status, 401);
    const file = await S.get(`/api/files/${lot1.invoiceFile}`);
    assert.equal(file.status, 200);
    assert.equal((await S.get('/api/files/..%2F..%2Fpackage.json')).status, 404);
    assert.equal((await A.raw('post', '/api/lots').field('vendor', vendor._id).attach('invoice', Buffer.from('x'), 'evil.exe')).status, 400);
  });

  test('rejects duplicate invoice for the same vendor and invalid lines', async () => {
    const dup = await lotRequest({ vendor: vendor._id, purchaseDate: '2026-09-11', invoiceNumber: 'PH/2026/118' }, [{ itemType: bolts._id, quantity: 1, costPerUnit: 1 }], false);
    assert.equal(dup.status, 409);
    const neg = await lotRequest({ vendor: vendor._id, purchaseDate: '2026-09-11', invoiceNumber: 'N1' }, [{ itemType: bolts._id, quantity: -5, costPerUnit: 1 }], false);
    assert.equal(neg.status, 400);
    const none = await lotRequest({ vendor: vendor._id, purchaseDate: '2026-09-11', invoiceNumber: 'N2' }, [], false);
    assert.equal(none.status, 400);
    const over = await lotRequest({ vendor: vendor._id, purchaseDate: '2026-09-11', invoiceNumber: 'N3', totalPaid: 99999 }, [{ itemType: bolts._id, quantity: 1, costPerUnit: 1 }], false);
    assert.equal(over.status, 400);
  });

  test('payments are appended, cannot exceed the balance, and mark-clear pays the rest', async () => {
    const id = lot1._id;
    const total = lot1.totalPayable;
    const p1 = await A.post(`/api/lots/${id}/payments`, { amount: 5000, method: 'UPI', reference: 'UTR 4455' });
    assert.equal(p1.status, 201);
    assert.equal(p1.body.data.totalPaid, 5000);
    assert.equal(p1.body.data.paymentStatus, 'partial');
    assert.equal((await A.post(`/api/lots/${id}/payments`, { amount: total })).status, 400);
    assert.equal((await A.post(`/api/lots/${id}/payments`, { amount: -10 })).status, 400);
    const clear = await A.post(`/api/lots/${id}/mark-clear`, {});
    assert.equal(clear.body.data.paymentStatus, 'paid');
    assert.equal(clear.body.data.balance, 0);
    assert.equal(clear.body.data.payments.length, 2); // history kept, nothing overwritten
    assert.equal((await A.post(`/api/lots/${id}/mark-clear`, {})).status, 409);
  });

  test('a lot with payments cannot be cancelled; an unpaid received lot can, and its stock is reversed', async () => {
    assert.equal((await A.del(`/api/lots/${lot1._id}`)).status, 409);
    const l2 = (await lotRequest({ vendor: vendor._id, purchaseDate: '2026-09-12', invoiceNumber: 'PH/2026/119', received: true }, [{ itemType: bolts._id, quantity: 100, costPerUnit: 5 }], false)).body.data;
    assert.equal(await stockOf(bolts._id), 300);
    assert.equal((await A.del(`/api/lots/${l2._id}`)).status, 200);
    assert.equal(await stockOf(bolts._id), 200);
    assert.equal((await A.get(`/api/lots/${l2._id}`)).body.data.isActive, false);
  });

  test('receiving later creates stock once; repeating is refused', async () => {
    const l3 = (await lotRequest({ vendor: vendor._id, purchaseDate: '2026-09-13', invoiceNumber: 'PH/2026/120' }, [{ itemType: cable._id, quantity: 20, costPerUnit: 80 }], false)).body.data;
    assert.equal(await stockOf(cable._id), 30);
    assert.equal((await A.post(`/api/lots/${l3._id}/receive`, {})).status, 200);
    assert.equal(await stockOf(cable._id), 50);
    assert.equal((await A.post(`/api/lots/${l3._id}/receive`, {})).status, 409);
    assert.equal(await stockOf(cable._id), 50);
  });

  test('ledger entries cannot be edited or deleted', async () => {
    const t = await InventoryTransaction.findOne();
    await assert.rejects(() => InventoryTransaction.updateOne({ _id: t._id }, { quantity: 1 }), /append-only/);
    await assert.rejects(() => InventoryTransaction.deleteMany({}), /append-only/);
    t.quantity = 999;
    await assert.rejects(() => t.save(), /append-only/);
  });

  test('adjustments need a reason and cannot take stock below zero', async () => {
    assert.equal((await A.post('/api/inventory/adjustments', { itemType: bolts._id, direction: 'out', quantity: 5 })).status, 400);
    assert.equal((await A.post('/api/inventory/adjustments', { itemType: bolts._id, direction: 'out', quantity: 5000, reason: 'Count' })).status, 409);
    assert.equal((await A.post('/api/inventory/adjustments', { itemType: bolts._id, direction: 'out', quantity: 20, reason: 'Damaged in storage' })).status, 201);
    assert.equal(await stockOf(bolts._id), 180);
    assert.equal((await A.post('/api/inventory/adjustments', { itemType: rent._id, direction: 'in', quantity: 1, reason: 'x' })).status, 400);
  });

  test('low stock is flagged and filterable', async () => {
    const all = (await A.get('/api/inventory')).body;
    assert.equal(all.data.find((r) => r._id === bolts._id).lowStock, false);
    await A.post('/api/inventory/adjustments', { itemType: bolts._id, direction: 'out', quantity: 140, reason: 'Issued to site' });
    const low = (await A.get('/api/inventory?lowStock=true')).body;
    assert.deepEqual(low.data.map((r) => r.name), ['M8 Hex Bolts']);
    assert.equal(low.meta.lowStockCount, 1);
    const tx = (await A.get(`/api/inventory/transactions?itemType=${bolts._id}`)).body;
    assert.ok(tx.data.length >= 4);
  });

  describe('item requests', () => {
    test('approval issues stock exactly once', async () => {
      const before = await stockOf(cable._id);
      const r = (await S.post('/api/item-requests', { itemType: cable._id, quantity: 12, reason: 'Wiring for workshop bay 2' })).body.data;
      assert.equal(r.status, 'requested');
      assert.equal(await stockOf(cable._id), before);
      const approved = await A.post(`/api/item-requests/${r._id}/approve`, {});
      assert.equal(approved.status, 200);
      assert.equal(approved.body.data.stockIssued, true);
      assert.equal(await stockOf(cable._id), before - 12);
      assert.equal((await A.post(`/api/item-requests/${r._id}/approve`, {})).status, 409);
      assert.equal(await stockOf(cable._id), before - 12);
    });

    test('insufficient stock blocks approval and leaves the request open', async () => {
      const r = (await S.post('/api/item-requests', { itemType: cable._id, quantity: 9999, reason: 'Too many' })).body.data;
      const res = await A.post(`/api/item-requests/${r._id}/approve`, {});
      assert.equal(res.status, 409);
      assert.match(res.body.message, /Insufficient stock/);
      const still = (await A.get('/api/item-requests?status=requested')).body.data.find((x) => x._id === r._id);
      assert.ok(still);
    });

    test('service types are approved without any stock movement; rejection records the reason', async () => {
      const n = await InventoryTransaction.countDocuments();
      const r = (await S.post('/api/item-requests', { itemType: rent._id, quantity: 1, reason: 'Storage space' })).body.data;
      assert.equal((await A.post(`/api/item-requests/${r._id}/approve`, {})).body.data.stockIssued, false);
      assert.equal(await InventoryTransaction.countDocuments(), n);
      const r2 = (await S.post('/api/item-requests', { itemType: bolts._id, quantity: 2, reason: 'Spare' })).body.data;
      const rej = await A.post(`/api/item-requests/${r2._id}/reject`, { reason: 'Use existing stock' });
      assert.equal(rej.body.data.status, 'rejected');
      assert.equal((await A.post(`/api/item-requests/${r2._id}/approve`, {})).status, 409);
    });

    test('staff only see their own requests and cannot decide them; invalid input is rejected', async () => {
      await S2.post('/api/item-requests', { itemType: bolts._id, quantity: 1, reason: 'Mine' });
      const mine = (await S2.get('/api/item-requests')).body.data;
      assert.equal(mine.length, 1);
      assert.equal(mine[0].requestedBy.name, 'Meena Joshi');
      assert.equal((await S.post(`/api/item-requests/${mine[0]._id}/approve`, {})).status, 403);
      assert.equal((await S.post('/api/item-requests', { itemType: bolts._id, quantity: 0, reason: 'x' })).status, 400);
      assert.equal((await S.post('/api/item-requests', { itemType: bolts._id, quantity: 1 })).status, 400);
    });
  });
});

describe('reimbursements', () => {
  let r;
  test('staff file a request for themselves only', async () => {
    const res = await S.post('/api/reimbursements', { date: '2026-09-20', amount: 640, spentOn: 'Auto fare to client site', claimant: admin.id, status: 'approved' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    r = res.body.data;
    assert.equal(r.status, 'requested');
    assert.equal(r.claimant._id, staff.id);
    assert.equal((await S.post('/api/reimbursements', { date: '2026-09-20', amount: -5, spentOn: 'x' })).status, 400);
  });

  test('requested -> approved -> paid, in order, and paid records are locked', async () => {
    assert.equal((await A.post(`/api/reimbursements/${r._id}/pay`, {})).status, 409);
    assert.equal((await A.post(`/api/reimbursements/${r._id}/approve`, { paidBy: 'Anita Desai' })).body.data.status, 'approved');
    assert.equal((await A.post(`/api/reimbursements/${r._id}/approve`, {})).status, 409);
    const paid = await A.post(`/api/reimbursements/${r._id}/pay`, { paymentMethod: 'Bank transfer', paymentReference: 'NEFT 9921' });
    assert.equal(paid.body.data.status, 'paid');
    assert.ok(paid.body.data.paidAt);
    assert.equal((await A.put(`/api/reimbursements/${r._id}`, { amount: 1 })).status, 409);
    assert.equal((await A.del(`/api/reimbursements/${r._id}`)).status, 409);
  });

  test('rejected requests are kept with the reason; staff cannot see others; summary adds up', async () => {
    const r2 = (await S2.post('/api/reimbursements', { date: '2026-09-21', amount: 300, spentOn: 'Printouts' })).body.data;
    const rej = await A.post(`/api/reimbursements/${r2._id}/reject`, { reason: 'No bill attached' });
    assert.equal(rej.body.data.rejectionReason, 'No bill attached');
    assert.equal((await S.get(`/api/reimbursements/${r2._id}`)).status, 404);
    assert.equal((await S.get('/api/reimbursements')).body.data.length, 1);
    const sum = (await A.get('/api/reimbursements/summary')).body.data;
    assert.equal(sum.paid.amount, 640);
    assert.equal(sum.rejected.amount, 300);
  });

  test('admin can record a claim for someone else and attach a bill', async () => {
    const res = await A.raw('post', '/api/reimbursements').field('claimant', staff2.id).field('date', '2026-09-22').field('amount', '1250.50').field('spentOn', 'Tea and refreshments for audit visit').attach('invoice', png, 'bill.png');
    assert.equal(res.status, 201);
    assert.equal(res.body.data.claimant._id, staff2.id);
    assert.ok(res.body.data.invoiceFile);
  });
});

describe('vehicles and fuel', () => {
  let vehicle, station;
  before(async () => {
    vehicle = (await A.post('/api/vehicles', { name: 'Mahindra Bolero', number: 'gj 06 ab 1234' })).body.data;
    station = (await A.post('/api/vendors', { name: 'Indian Oil - Alkapuri' })).body.data;
  });

  test('vehicle numbers are normalised and unique', async () => {
    assert.equal(vehicle.number, 'GJ 06 AB 1234');
    assert.equal((await A.post('/api/vehicles', { name: 'Dup', number: 'GJ 06 AB 1234' })).status, 409);
  });

  test('the backend calculates the fuel total; staff see only their own entries', async () => {
    const res = await S.post('/api/fuel', { vendor: station._id, vehicle: vehicle._id, date: '2026-09-18', litres: 32.5, costPerLitre: 94.72, total: 1, invoiceNumber: 'IOC-77123' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.total, 3078.4);
    await A.post('/api/fuel', { vendor: station._id, vehicle: vehicle._id, date: '2026-09-19', litres: 10, costPerLitre: 95, fueledBy: admin.id, invoiceNumber: 'IOC-77200' });
    assert.equal((await S.get('/api/fuel')).body.data.length, 1);
    const all = (await A.get('/api/fuel')).body;
    assert.equal(all.data.length, 2);
    assert.equal(all.meta.totalLitres, 42.5);
    assert.equal(all.meta.totalAmount, 4028.4);
    assert.equal((await A.get(`/api/fuel?vehicle=${vehicle._id}&from=2026-09-19`)).body.data.length, 1);
  });

  test('invalid fuel entries are rejected; deactivated entries leave the totals', async () => {
    assert.equal((await S.post('/api/fuel', { vendor: station._id, vehicle: vehicle._id, date: '2026-09-18', litres: 0, costPerLitre: 90 })).status, 400);
    assert.equal((await S.post('/api/fuel', { vendor: station._id, vehicle: new mongoose.Types.ObjectId(), date: '2026-09-18', litres: 5, costPerLitre: 90 })).status, 400);
    const entry = (await A.get('/api/fuel')).body.data[0];
    await A.del(`/api/fuel/${entry._id}`);
    assert.equal((await A.get('/api/fuel')).body.data.length, 1);
  });
});

describe('Excel exports and dashboard', () => {
  test('investor sheet contains purchases, fuel and approved reimbursements', async () => {
    const res = await A.raw('get', '/api/exports/investor-sheet?from=2026-09-01&to=2026-09-30').buffer().parse((r, cb) => { const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => cb(null, Buffer.concat(c))); });
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /spreadsheetml/);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body);
    const text = [];
    wb.getWorksheet('Data').eachRow((row) => row.eachCell((c) => text.push(String(c.value))));
    const joined = text.join('|');
    assert.ok(joined.includes('PH/2026/118'));
    assert.ok(joined.includes('IOC-77200') || joined.includes('IOC-77123'));
    assert.ok(joined.includes('Auto fare to client site'));
    assert.ok(!joined.includes('Tea and refreshments')); // still only requested
    assert.ok(!joined.includes('Printouts')); // rejected claims are excluded
  });

  test('inventory sheet lists lot lines and totals; bad ranges and staff are refused', async () => {
    const res = await A.raw('get', '/api/exports/inventory-sheet?from=2026-09-01&to=2026-09-30').buffer().parse((r, cb) => { const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => cb(null, Buffer.concat(c))); });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body);
    const text = [];
    wb.getWorksheet('Data').eachRow((row) => row.eachCell((c) => text.push(String(c.value))));
    assert.ok(text.includes('M8 Hex Bolts') && text.includes('Total'));
    assert.ok(!text.includes('PH/2026/119')); // cancelled lot not exported
    assert.equal((await A.get('/api/exports/investor-sheet')).status, 400);
    assert.equal((await A.get('/api/exports/investor-sheet?from=2026-10-01&to=2026-09-01')).status, 400);
    assert.equal((await S.get('/api/exports/inventory-sheet?from=2026-09-01&to=2026-09-30')).status, 403);
  });

  test('dashboard summary differs for admin and staff', async () => {
    const a = (await A.get('/api/dashboard/summary')).body.data;
    assert.equal(a.role, 'admin');
    assert.equal(a.lowStockCount, 1);
    assert.ok(a.pendingItemRequests >= 1);
    const s = (await S.get('/api/dashboard/summary')).body.data;
    assert.equal(s.role, 'staff');
    assert.equal(s.lowStockCount, undefined);
  });
});
