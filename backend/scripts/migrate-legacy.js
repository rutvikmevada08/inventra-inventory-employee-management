/*
 * Migrates data from the old EJS/Express application's MongoDB into the new schema.
 *
 * Usage (dry run is the default and writes nothing):
 *   npm run migrate:legacy -- --legacy-uploads=../old-project/public/uploads
 *   npm run migrate:legacy -- --legacy-uploads=../old-project/public/uploads --apply --admin-emails=you@company.com
 *
 * Configuration (environment):
 *   LEGACY_MONGODB_URI   the OLD database, e.g. mongodb://127.0.0.1:27017/test  (the old app used the default "test" db)
 *   MONGODB_URI          the NEW database; must be a different database
 *
 * Safety:
 *   - The legacy database is only ever read.
 *   - Old _ids are kept, so every reference between records stays valid.
 *   - Re-running is safe: a record whose _id already exists in the new database is skipped, never overwritten.
 *   - Legacy files are copied into UPLOAD_DIR under their original names. Nothing is deleted or overwritten.
 *
 * OLD -> NEW MAPPING
 *   employee            -> users          Name->name, Email->email (lower-cased), Number->phone (string),
 *                                         Password (plain text) -> passwordHash (bcrypt). No password => loginEnabled=false.
 *                                         Everyone becomes role "staff"; pass --admin-emails to promote.
 *   itemType            -> itemtypes      Type_name->name. isStockable is guessed from the name: services such as rent,
 *                                         bills, renewals and fees are marked non-stockable (editable in the app).
 *   vendor              -> vendors        Business_name->name, Business_email->email, Business_contact_number->phone (string)
 *   lot                 -> lots           Lot_type->lotType, Paid_by->paidBy, Purchase_date->purchaseDate,
 *                                         Invoice_number->invoiceNumber, Total_payable->totalPayable, Received->received,
 *                                         Invoice (path)->invoiceFile (file name only). A non-zero Total_paid becomes one
 *                                         opening entry in payments[] so the payment history starts consistent.
 *   item                -> lotitems       Item_type->itemType, Lot_id->lot, Cost_per_unit->costPerUnit, Quantity->quantity.
 *                                         Lines whose lot no longer exists are skipped (the old "delete lot" left them orphaned).
 *   (none)              -> inventorytransactions
 *                                         One stock-in per stockable line of every lot that was already Received, dated at the
 *                                         purchase date. Requests approved in the old app did not move stock, so no stock-outs
 *                                         are invented for them.
 *   item_req            -> itemrequests   Status Requested/Accepted/Rejected -> requested/approved/rejected, stockIssued=false.
 *   reimbursement_req   -> reimbursements status "requested" (spentOn = reason [+ item])
 *   reimbursement       -> reimbursements Pending -> approved, Reimbursed -> paid. Placeholder "NA" values are dropped.
 *                                         (Requests rejected in the old app were deleted, so there is nothing to bring over.)
 *   vehicle             -> vehicles       Vehicle_name->name, Vehicle_number->number
 *   fuel                -> fuelentries    Litre->litres, Cost_per_litre->costPerLitre, Total->total (kept as recorded),
 *                                         Vehicle_num->vehicle, Fueled_by->fueledBy, Invoice->invoiceFile
 *
 *   Not migrated: the old session data and the hard-coded credentials (rotate those). Records that reference missing
 *   parents are skipped and listed in the report.
 */
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const ItemType = require('../models/ItemType');
const Lot = require('../models/Lot');
const LotItem = require('../models/LotItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const ItemRequest = require('../models/ItemRequest');
const Reimbursement = require('../models/Reimbursement');
const Vehicle = require('../models/Vehicle');
const FuelEntry = require('../models/FuelEntry');

const SERVICE_NAME = /\b(bill|rent|renewal|service|servicing|fee|fees|premium|subscription|connection|repair|maintenance|compliance|audit|insurance)\b/i;
const NA = (v) => (v === undefined || v === null || String(v).trim() === '' || String(v).trim().toUpperCase() === 'NA' ? undefined : String(v).trim());
const fileName = (p) => (p ? path.basename(String(p).replace(/\\/g, '/')) : undefined);
// The driver would store undefined as null, so absent values are dropped before inserting.
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const num = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));

async function runMigration({ legacyUri, apply = false, legacyUploads, adminEmails = [], log = console.log }) {
  const report = { apply, counts: {}, warnings: [], files: { found: 0, missing: 0, copied: 0 } };
  const warn = (m) => report.warnings.push(m);
  const now = new Date();
  const stamp = { createdAt: now, updatedAt: now };

  const target = mongoose.connection;
  const legacy = mongoose.createConnection(legacyUri, { serverSelectionTimeoutMS: 8000 });
  await legacy.asPromise();
  try {
    if (legacy.name === target.name && legacy.host === target.host && legacy.port === target.port) {
      throw new Error('The legacy and target databases are the same. Use a separate database for the new application.');
    }
    const read = (name) => legacy.db.collection(name).find({}).toArray();
    const [oEmployees, oTypes, oVendors, oLots, oItems, oItemReqs, oReimb, oReimbReqs, oVehicles, oFuel] = await Promise.all(
      ['employees', 'itemtypes', 'vendors', 'lots', 'items', 'item_reqs', 'reimbursements', 'reimbursement_reqs', 'vehicles', 'fuels'].map(read)
    );

    // Inserts only documents whose _id is not already present. Raw inserts, so legacy data is not
    // rejected by the new validators (problems are reported as warnings instead).
    async function load(label, Model, docs) {
      const ids = docs.map((d) => d._id);
      const existing = new Set((await Model.collection.find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)));
      const fresh = docs.filter((d) => !existing.has(String(d._id)));
      if (apply && fresh.length) await Model.collection.insertMany(fresh.map((d) => clean({ ...stamp, ...d })), { ordered: false });
      report.counts[label] = { source: docs.length, new: fresh.length, alreadyPresent: docs.length - fresh.length };
    }

    // ---- files -----------------------------------------------------------------
    function mapFile(stored, owner) {
      const name = fileName(stored);
      if (!name) return undefined;
      if (!legacyUploads) return name;
      const src = path.join(legacyUploads, name);
      if (!fs.existsSync(src)) {
        report.files.missing += 1;
        warn(`${owner}: invoice file "${name}" not found in legacy uploads`);
        return name;
      }
      report.files.found += 1;
      const dest = path.join(env.uploadDir, name);
      if (apply && !fs.existsSync(dest)) {
        fs.mkdirSync(env.uploadDir, { recursive: true });
        fs.copyFileSync(src, dest);
        report.files.copied += 1;
      }
      return name;
    }

    // ---- users -----------------------------------------------------------------
    const admins = new Set(adminEmails.map((e) => e.toLowerCase().trim()));
    const userMap = new Map(); // old _id -> kept _id (differs only for duplicate e-mails)
    const seenEmail = new Map();
    const users = [];
    for (const e of oEmployees) {
      const email = NA(e.Email)?.toLowerCase();
      if (!email) { warn(`employee ${e._id}: no e-mail, skipped`); continue; }
      if (seenEmail.has(email)) {
        userMap.set(String(e._id), seenEmail.get(email));
        warn(`employee ${e._id}: duplicate e-mail ${email}, merged into the first record`);
        continue;
      }
      seenEmail.set(email, e._id);
      userMap.set(String(e._id), e._id);
      users.push({
        _id: e._id,
        name: NA(e.Name) || email.split('@')[0],
        email,
        phone: NA(e.Number),
        role: admins.has(email) ? 'admin' : 'staff',
        loginEnabled: Boolean(e.Password),
        passwordHash: e.Password && apply ? await bcrypt.hash(String(e.Password), 12) : undefined,
        isActive: true,
      });
    }
    const unknownAdmins = [...admins].filter((a) => !seenEmail.has(a));
    if (unknownAdmins.length) warn(`--admin-emails not found among legacy users: ${unknownAdmins.join(', ')}`);
    if (!admins.size) warn('No --admin-emails given: every migrated user is "staff". Create an admin with: npm run create-admin');
    await load('users', User, users);
    const user = (id) => userMap.get(String(id));

    // ---- lookups ---------------------------------------------------------------
    const types = oTypes.filter((t) => NA(t.Type_name)).map((t) => ({
      _id: t._id, name: String(t.Type_name).trim(), unit: 'pcs', reorderLevel: 0, isStockable: !SERVICE_NAME.test(t.Type_name), isActive: true,
    }));
    await load('itemTypes', ItemType, types);
    const typeById = new Map(types.map((t) => [String(t._id), t]));

    const vendors = oVendors.map((v) => ({
      _id: v._id, name: NA(v.Business_name) || 'Unnamed vendor', email: NA(v.Business_email)?.toLowerCase(), phone: NA(v.Business_contact_number), isActive: true,
    }));
    await load('vendors', Vendor, vendors);
    const vendorIds = new Set(vendors.map((v) => String(v._id)));

    const vehicles = oVehicles.map((v) => ({ _id: v._id, name: NA(v.Vehicle_name) || 'Vehicle', number: (NA(v.Vehicle_number) || '').toUpperCase(), isActive: true }));
    await load('vehicles', Vehicle, vehicles);
    const vehicleIds = new Set(vehicles.map((v) => String(v._id)));

    // ---- lots, lines, stock ----------------------------------------------------
    const lots = [];
    for (const l of oLots) {
      if (!vendorIds.has(String(l.Vendor))) { warn(`lot ${l._id} (${l.Invoice_number}): vendor missing, skipped`); continue; }
      const payable = num(l.Total_payable) || 0;
      const paid = num(l.Total_paid) || 0;
      if (paid > payable) warn(`lot ${l._id} (${l.Invoice_number}): Total_paid (${paid}) exceeds Total_payable (${payable}), kept as recorded`);
      lots.push({
        _id: l._id,
        vendor: l.Vendor,
        purchaseDate: l.Purchase_date,
        invoiceNumber: String(l.Invoice_number || '').trim() || 'UNKNOWN',
        lotType: NA(l.Lot_type),
        paidBy: NA(l.Paid_by),
        description: NA(l.Description),
        totalPayable: payable,
        totalPaid: paid,
        paymentStatus: paid <= 0 ? 'unpaid' : paid >= payable ? 'paid' : 'partial',
        payments: paid > 0 ? [{ _id: new mongoose.Types.ObjectId(), amount: paid, date: l.Purchase_date, note: 'Opening balance migrated from previous system', createdAt: now }] : [],
        received: Boolean(l.Received),
        receivedAt: l.Received ? l.Purchase_date : undefined,
        invoiceFile: mapFile(l.Invoice, `lot ${l.Invoice_number}`),
        isActive: true,
      });
    }
    await load('lots', Lot, lots);
    const lotById = new Map(lots.map((l) => [String(l._id), l]));

    const lines = [];
    for (const i of oItems) {
      if (!lotById.has(String(i.Lot_id))) { warn(`item ${i._id}: its lot no longer exists, skipped`); continue; }
      if (!typeById.has(String(i.Item_type))) { warn(`item ${i._id}: item type missing, skipped`); continue; }
      lines.push({ _id: i._id, lot: i.Lot_id, itemType: i.Item_type, quantity: num(i.Quantity) || 0, costPerUnit: num(i.Cost_per_unit) || 0, totalPayable: num(i.Total_payable) || 0 });
    }
    await load('lotItems', LotItem, lines);

    // Stock-in for lines of lots already received. Inserted directly because the model blocks updates, and
    // keyed by lotItem so a re-run cannot double-count.
    const receipts = lines
      .filter((ln) => lotById.get(String(ln.lot)).received && typeById.get(String(ln.itemType)).isStockable)
      .map((ln) => ({
        itemType: ln.itemType, type: 'in', quantity: ln.quantity, source: 'lot', date: lotById.get(String(ln.lot)).purchaseDate,
        lot: ln.lot, lotItem: ln._id, note: 'Migrated from previous system',
      }));
    const doneLines = new Set((await InventoryTransaction.collection.find({ lotItem: { $in: receipts.map((r) => r.lotItem) } }).toArray()).map((t) => String(t.lotItem)));
    const freshReceipts = receipts.filter((r) => !doneLines.has(String(r.lotItem)));
    if (apply && freshReceipts.length) await InventoryTransaction.collection.insertMany(freshReceipts.map((r) => clean({ _id: new mongoose.Types.ObjectId(), ...stamp, ...r })));
    report.counts.stockEntries = { source: receipts.length, new: freshReceipts.length, alreadyPresent: receipts.length - freshReceipts.length };

    // ---- item requests ---------------------------------------------------------
    const statusMap = { requested: 'requested', accepted: 'approved', rejected: 'rejected' };
    const itemRequests = [];
    for (const r of oItemReqs) {
      const requestedBy = user(r.Employee);
      if (!requestedBy || !typeById.has(String(r.item))) { warn(`item request ${r._id}: employee or item type missing, skipped`); continue; }
      itemRequests.push({
        _id: r._id, requestedBy, itemType: r.item, quantity: num(r.Quantity) || 0, reason: NA(r.reason) || '-', date: r.Date,
        status: statusMap[String(r.Status || '').toLowerCase()] || 'requested', stockIssued: false,
      });
    }
    await load('itemRequests', ItemRequest, itemRequests);

    // ---- reimbursements --------------------------------------------------------
    const reimbursements = [];
    for (const r of oReimb) {
      const claimant = user(r.employee);
      if (!claimant) { warn(`reimbursement ${r._id}: employee missing, skipped`); continue; }
      const s = String(r.Status || '').toLowerCase();
      if (!['pending', 'reimbursed'].includes(s)) warn(`reimbursement ${r._id}: unknown status "${r.Status}", treated as approved`);
      reimbursements.push({
        _id: r._id, claimant, date: r.Date, amount: num(r.Amount) || 0, spentOn: NA(r.Spent_on) || '-', vendorName: NA(r.Vendor),
        invoiceNumber: NA(r.Invoice_number), invoiceFile: mapFile(r.Invoice, `reimbursement ${r._id}`),
        status: s === 'reimbursed' ? 'paid' : 'approved', paidBy: NA(r.Paid_by), isActive: true,
      });
    }
    for (const r of oReimbReqs) {
      const claimant = user(r.Employee);
      if (!claimant) { warn(`reimbursement request ${r._id}: employee missing, skipped`); continue; }
      reimbursements.push({
        _id: r._id, claimant, date: r.Date, amount: num(r.requested_amount) || 0,
        spentOn: [NA(r.reason), NA(r.Item) && `(${NA(r.Item)})`].filter(Boolean).join(' ') || '-',
        vendorName: NA(r.Vendor), invoiceNumber: NA(r.Invoice_number), status: 'requested', isActive: true,
      });
    }
    await load('reimbursements', Reimbursement, reimbursements);

    // ---- fuel ------------------------------------------------------------------
    const fuel = [];
    for (const f of oFuel) {
      const fueledBy = user(f.Fueled_by);
      if (!vendorIds.has(String(f.Vendor)) || !vehicleIds.has(String(f.Vehicle_num)) || !fueledBy) { warn(`fuel entry ${f._id}: vendor, vehicle or user missing, skipped`); continue; }
      fuel.push({
        _id: f._id, vendor: f.Vendor, vehicle: f.Vehicle_num, date: f.Date, litres: num(f.Litre) || 0, costPerLitre: num(f.Cost_per_litre) || 0,
        total: num(f.Total) || 0, fueledBy, invoiceNumber: NA(f.Invoice_number), invoiceFile: mapFile(f.Invoice, `fuel ${f.Invoice_number}`), isActive: true,
      });
    }
    await load('fuelEntries', FuelEntry, fuel);
  } finally {
    await legacy.close();
  }

  log(report.apply ? 'MIGRATION APPLIED' : 'DRY RUN - nothing was written');
  for (const [k, v] of Object.entries(report.counts)) log(`  ${k.padEnd(14)} source ${String(v.source).padStart(5)}   new ${String(v.new).padStart(5)}   already present ${String(v.alreadyPresent).padStart(5)}`);
  if (legacyUploads) log(`  files          found ${report.files.found}, missing ${report.files.missing}, copied ${report.files.copied}`);
  if (report.warnings.length) { log(`\n${report.warnings.length} warning(s):`); report.warnings.forEach((w) => log(`  - ${w}`)); }
  if (!apply) log('\nRe-run with --apply to write these changes.');
  return report;
}

module.exports = { runMigration };

if (require.main === module) {
  const { connectDb } = require('../config/db');
  const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v === undefined ? true : v]; }));
  (async () => {
    env.validate();
    if (!process.env.LEGACY_MONGODB_URI) throw new Error('Set LEGACY_MONGODB_URI to the old database, e.g. mongodb://127.0.0.1:27017/test');
    await connectDb();
    await runMigration({
      legacyUri: process.env.LEGACY_MONGODB_URI,
      apply: Boolean(args.apply),
      legacyUploads: args['legacy-uploads'] && path.resolve(args['legacy-uploads']),
      adminEmails: String(args['admin-emails'] || '').split(',').filter(Boolean),
    });
    await mongoose.disconnect();
  })().catch((err) => { console.error(err.message); process.exit(1); });
}
