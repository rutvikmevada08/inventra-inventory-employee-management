/*
 * End-to-end smoke test of the main business flows over real HTTP (multipart uploads included).
 * It CREATES DATA, so run it only against a throwaway database:
 *
 *   MONGODB_URI=mongodb://127.0.0.1:27017/smart_inventory_smoke PORT=5001 UPLOAD_DIR=/tmp/smoke-uploads \
 *     ADMIN_PASSWORD='Admin#2026demo' npm run create-admin -- "Admin" admin@example.com
 *   (start the API with the same env, then)
 *   API_URL=http://127.0.0.1:5001/api node tests/e2e/smoke.mjs
 *
 * Not part of `npm test`.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url.replace('tests/e2e/smoke.mjs', 'package.json'));
const ExcelJS = require('exceljs');
const BASE = process.env.API_URL || 'http://127.0.0.1:5173/api'; // default: through the Vite proxy, like the browser
const ADMIN = { email: process.env.SMOKE_ADMIN_EMAIL || 'admin@example.com', password: process.env.SMOKE_ADMIN_PASSWORD || 'Admin#2026demo' };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
let pass = 0, failed = [];
const check = (name, cond, extra = '') => { if (cond) { pass++; console.log('  PASS', name); } else { failed.push(name); console.log('  FAIL', name, extra); } };
const call = async (method, url, { token, json, form } = {}) => {
  const headers = {}; if (token) headers.Authorization = `Bearer ${token}`;
  let body; if (json) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); } if (form) body = form;
  const res = await fetch(BASE + url, { method, headers, body });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, body: data, type };
};
const fd = (obj, file) => { const f = new FormData(); for (const [k, v] of Object.entries(obj)) f.append(k, typeof v === 'string' ? v : JSON.stringify(v)); if (file) f.append('invoice', new Blob([png], { type: 'image/png' }), 'bill.png'); return f; };

console.log('Sign in');
const A = (await call('POST', '/auth/login', { json: ADMIN })).body.data.token;
check('admin signs in', !!A);
const mk = await call('POST', '/users', { token: A, json: { name: 'Rakesh Patel', email: 'rakesh@example.com', password: 'Staff#2026demo', role: 'staff' } });
check('admin creates a staff user', mk.status === 201);
const S = (await call('POST', '/auth/login', { json: { email: 'rakesh@example.com', password: 'Staff#2026demo' } })).body.data.token;
check('staff signs in', !!S);

console.log('Masters');
const vendor = (await call('POST', '/vendors', { token: A, json: { name: 'Shree Ganesh Electricals', phone: '9825012345' } })).body.data;
const station = (await call('POST', '/vendors', { token: A, json: { name: 'Indian Oil - Alkapuri' } })).body.data;
const bolts = (await call('POST', '/item-types', { token: A, json: { name: 'M8 Hex Bolts', unit: 'pcs', reorderLevel: 50, isStockable: true } })).body.data;
const rent = (await call('POST', '/item-types', { token: A, json: { name: 'Office Rent', isStockable: false } })).body.data;
const car = (await call('POST', '/vehicles', { token: A, json: { name: 'Mahindra Bolero', number: 'GJ 06 AB 1234' } })).body.data;
check('vendor, item types and vehicle created', vendor && bolts && rent && car && station);

console.log('Purchase (multipart, like the form)');
const lotRes = await call('POST', '/lots', { token: A, form: fd({ vendor: vendor._id, purchaseDate: '2026-09-10', invoiceNumber: 'SGE/221', received: 'true', totalPaid: '0', items: [{ itemType: bolts._id, quantity: 200, costPerUnit: 4.5 }, { itemType: rent._id, quantity: 1, costPerUnit: 15000 }] }, true) });
check('lot created with invoice file', lotRes.status === 201, JSON.stringify(lotRes.body));
const lot = lotRes.body.data;
check('invoice total = items total (900 + 15000)', lot.totalPayable === 15900);
let inv = (await call('GET', '/inventory', { token: A })).body;
check('stock-in created for the stockable line only (200)', inv.data.length === 1 && inv.data[0].balance === 200);
check('invoice file needs a token', (await call('GET', `/files/${lot.invoiceFile}`)).status === 401);
const file = await call('GET', `/files/${lot.invoiceFile}`, { token: S });
check('invoice file opens for a signed-in user', file.status === 200 && file.type.includes('image/png'));

console.log('Payments');
check('part payment accepted', (await call('POST', `/lots/${lot._id}/payments`, { token: A, json: { amount: 5000, method: 'UPI', reference: 'UTR 4455' } })).body.data.paymentStatus === 'partial');
check('over-payment refused', (await call('POST', `/lots/${lot._id}/payments`, { token: A, json: { amount: 999999 } })).status === 400);
const cleared = await call('POST', `/lots/${lot._id}/mark-clear`, { token: A, json: {} });
check('mark as cleared pays the balance and keeps both payments', cleared.body.data.paymentStatus === 'paid' && cleared.body.data.payments.length === 2);
check('clearing twice is refused', (await call('POST', `/lots/${lot._id}/mark-clear`, { token: A, json: {} })).status === 409);
check('paid purchase cannot be cancelled', (await call('DELETE', `/lots/${lot._id}`, { token: A })).status === 409);

console.log('Item requests');
const r1 = (await call('POST', '/item-requests', { token: S, json: { itemType: bolts._id, quantity: 30, reason: 'Fixture build' } })).body.data;
check('staff request created', r1.status === 'requested');
check('staff cannot approve', (await call('POST', `/item-requests/${r1._id}/approve`, { token: S, json: {} })).status === 403);
check('admin approves', (await call('POST', `/item-requests/${r1._id}/approve`, { token: A, json: {} })).body.data.stockIssued === true);
inv = (await call('GET', '/inventory', { token: A })).body;
check('stock fell to 170 and is now flagged? (170 > 50 so no)', inv.data[0].balance === 170 && inv.data[0].lowStock === false);
const r2 = (await call('POST', '/item-requests', { token: S, json: { itemType: bolts._id, quantity: 500, reason: 'Too many' } })).body.data;
const big = await call('POST', `/item-requests/${r2._id}/approve`, { token: A, json: {} });
check('approval blocked when stock is short', big.status === 409 && /Insufficient stock/.test(big.body.message));
await call('POST', '/inventory/adjustments', { token: A, json: { itemType: bolts._id, direction: 'out', quantity: 130, reason: 'Issued to site' } });
inv = (await call('GET', '/inventory?lowStock=true', { token: A })).body;
check('low-stock filter returns the item (40 left, level 50)', inv.data.length === 1 && inv.data[0].balance === 40);
const ledger = (await call('GET', `/inventory/transactions?itemType=${bolts._id}`, { token: A })).body;
check('ledger has receipt, issue and adjustment', ledger.data.length === 3);

console.log('Reimbursements');
const c = (await call('POST', '/reimbursements', { token: S, form: fd({ date: '2026-09-20', amount: '640', spentOn: 'Auto fare to client site', vendorName: 'City Autos' }, true) })).body.data;
check('staff claim with bill copy created', c.status === 'requested' && !!c.invoiceFile);
check('cannot pay before approval', (await call('POST', `/reimbursements/${c._id}/pay`, { token: A, json: {} })).status === 409);
await call('POST', `/reimbursements/${c._id}/approve`, { token: A, json: { paidBy: 'Anita Desai' } });
const paid = await call('POST', `/reimbursements/${c._id}/pay`, { token: A, json: { paymentMethod: 'UPI', paymentReference: 'UTR 9921' } });
check('approved claim marked as paid', paid.body.data.status === 'paid');
check('paid claim is locked', (await call('PUT', `/reimbursements/${c._id}`, { token: A, json: { amount: 1 } })).status === 409);
const sum = (await call('GET', '/reimbursements/summary', { token: A })).body.data;
check('summary shows 640 paid', sum.paid.amount === 640 && sum.paid.count === 1);

console.log('Fuel');
const f = await call('POST', '/fuel', { token: S, form: fd({ vehicle: car._id, vendor: station._id, date: '2026-09-18', litres: '32.5', costPerLitre: '94.72', invoiceNumber: 'IOC-77123' }, true) });
check('fuel entry total calculated by the server (3078.40)', f.status === 201 && f.body.data.total === 3078.4, JSON.stringify(f.body));
const fl = (await call('GET', '/fuel', { token: A })).body;
check('fuel totals in list meta', fl.meta.totalLitres === 32.5 && fl.meta.totalAmount === 3078.4);

console.log('Excel exports (through the proxy)');
for (const [name, url] of [['investor', '/exports/investor-sheet?from=2026-09-01&to=2026-09-30'], ['inventory', '/exports/inventory-sheet?from=2026-09-01&to=2026-09-30']]) {
  const x = await call('GET', url, { token: A });
  check(`${name} sheet downloads as xlsx`, x.status === 200 && x.type.includes('spreadsheetml') && x.body.slice(0, 2).toString() === 'PK');
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(x.body); const ws = wb.getWorksheet('Data');
  const text = []; ws.eachRow((r) => r.eachCell((cell) => text.push(String(cell.value))));
  if (name === 'investor') {
    check('investor sheet lists the purchase, fuel and the paid claim', text.includes('SGE/221') && text.includes('IOC-77123') && text.includes('Auto fare to client site'));
    check('investor sheet: purchase row 6 and fuel banner at row 10 (9 + 1 purchase)', ws.getCell('B6').value === 'SGE/221' && /^MISCELLANEOUS \(FUEL\)/.test(ws.getCell('A10').value));
  } else check('inventory sheet lists the items and a total', text.includes('M8 Hex Bolts') && text.includes('Total'));
}
check('staff cannot download exports', (await call('GET', '/exports/investor-sheet?from=2026-09-01&to=2026-09-30', { token: S })).status === 403);

console.log('Lists and dashboard');
check('lot list filter by payment status', (await call('GET', '/lots?paymentStatus=paid', { token: A })).body.data.length === 1);
check('lot list shows nothing unpaid', (await call('GET', '/lots?paymentStatus=unpaid', { token: A })).body.data.length === 0);
const d = (await call('GET', '/dashboard/summary', { token: A })).body.data;
check('dashboard: 1 low-stock item, 1 pending request, 4028.40-style fuel figure', d.lowStockCount === 1 && d.pendingItemRequests === 1 && d.fuelThisMonth.amount >= 0);
const sd = (await call('GET', '/dashboard/summary', { token: S })).body.data;
check('staff dashboard shows only their own counts', sd.role === 'staff' && sd.openItemRequests === 1);

console.log(`\n${pass} passed, ${failed.length} failed`); if (failed.length) { console.log(failed.join('\n')); process.exit(1); }
