# Smart Inventory & Workforce Management System

A web application for a small or medium-sized organisation to manage purchases and stock, vendors, staff
requests and reimbursements, and vehicle fuel. Labour attendance, daily wages, advances and payroll are the
next modules (see Status).

This project evolved from an existing Express + EJS inventory application. The working business logic was kept
(purchase lots with line items, payment settlement, item-request and reimbursement approval, fuel logging, the
investor and inventory Excel sheets) and moved behind a REST API with a React front end.

## Status

| Phase | Scope | State |
|---|---|---|
| 1-2 | Analysis of the old app, target design | Done |
| 3 | REST API, auth, inventory ledger, vendors, requests, reimbursements, fuel, exports, legacy migration | Done |
| 4 | React + Vite shell: login, layout, routing, dashboard, vendors | Done |
| 5 | Inventory screens: purchases, stock, ledger, item requests, reimbursements, fuel, vehicles, item types, users, Excel exports | Done |
| 6-9 | Employees, attendance, payroll, advances, payment history | Planned |
| 10-12 | Reports, dashboard charts, UI pass, final cleanup | Planned |

## Technology

React, Vite, React Router, Axios, plain CSS. Node.js, Express, Mongoose, MongoDB. JWT (Bearer header) with bcrypt
password hashing and `admin` / `staff` roles. ExcelJS for exports, Multer for uploads, Nodemailer for optional
e-mail notifications. No Bootstrap, no Tailwind, no EJS.

## Project layout

```
backend/    Express API   (config, middleware, models, controllers, routes, services, scripts, tests)
frontend/   React app     (components, pages, layouts, services, hooks, context, utils, styles)
```

## Running it locally

Requirements: Node.js 18 or newer and a MongoDB server.

```bash
# 1. Backend
cd backend
cp .env.example .env          # then set JWT_SECRET (see the file for a one-line generator)
npm install
npm run create-admin -- "Your Name" you@example.com   # prompts for a password
npm run dev                   # http://localhost:5000

# 2. Frontend (second terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api to the backend)
```

Environment variables are documented in `backend/.env.example`. Nothing secret is read by the front end.

## Migrating data from the old application

The migration has not been run against real data. The old database is only ever read, and the script is a dry run
unless `--apply` is given. Start with a dry run, which writes nothing:

```bash
cd backend
LEGACY_MONGODB_URI=mongodb://127.0.0.1:27017/test \
  npm run migrate:legacy -- --legacy-uploads=/path/to/old-project/public/uploads
```

Then apply it. Old `_id`s are kept, so it is safe to run again; records already migrated are skipped.

```bash
LEGACY_MONGODB_URI=... npm run migrate:legacy -- --legacy-uploads=... --apply --admin-emails=you@company.com
```

The old app used the default `test` database, so point `MONGODB_URI` at a different database name. The mapping from
old collections to new ones is documented at the top of `backend/scripts/migrate-legacy.js`. Old plain-text passwords
are replaced by bcrypt hashes; everyone becomes `staff` unless listed in `--admin-emails`. Invoice files are copied
into `backend/uploads/` under their original names.

## Tests

```bash
cd backend  && npm test    # API tests: needs a MongoDB; uses the database in TEST_MONGODB_URI
cd frontend && npm test
```

The API tests drop their own database (default `smart_inventory_test`). Do not point `TEST_MONGODB_URI` at real data.

`backend/tests/e2e/smoke.mjs` drives the main workflows over real HTTP, including file uploads and Excel downloads,
against a running API. It creates data, so use a throwaway database (instructions at the top of the file).

### Needs verification against a real MongoDB

Development and the automated tests ran against FerretDB 1.24 (a MongoDB-compatible server) because no `mongod` was
available. Before deploying, run `cd backend && npm test` against your own MongoDB (`TEST_MONGODB_URI`). The first lines
of `tests/mongo-specific.test.js` output say which server was used. These are the database-dependent behaviours to confirm:

| Behaviour | Where it matters | Checked by |
|---|---|---|
| Sparse unique indexes on `InventoryTransaction.lotItem`, `.itemRequest`, `.reversalOf` | A lot line can be received once, a request issued once, a receipt reversed once | `mongo-specific.test.js` (passed on FerretDB; confirm on MongoDB) |
| Unique index on `User.email` | Duplicate accounts | `mongo-specific.test.js` |
| Records without an `isActive` field count as active (`$ne: false`) | Older or imported data | `mongo-specific.test.js` |
| `$group` with one `$sum` per stage | Stock balances, fuel and reimbursement totals, dashboard | `mongo-specific.test.js`, API tests |
| Mongoose index creation at start-up (`autoIndex`) | The indexes above exist in production | Check `db.inventorytransactions.getIndexes()` once |
| No multi-document transactions | Lot creation and stock receipts are undone by hand on failure (a standalone server has no transactions). On a replica set this could be tightened | Review, not testable here |
| `insertMany` with `ordered: false` and raw inserts | `scripts/migrate-legacy.js` | Dry-run it against a copy of your real database first |

Aggregations deliberately avoid `$max` and several accumulators in one `$group`, which FerretDB 1.24 does not support;
they work on MongoDB too, so nothing is lost.

## Design decisions worth knowing

- **Users and employees are different things.** `User` is someone who signs in. `Employee` (Phase 6) is a labour record
  used for attendance and wages and may optionally link to a user.
- **Stock is a ledger.** Stock on hand is calculated from append-only `InventoryTransaction` entries. Receiving a lot adds
  stock-in entries, approving an item request adds a stock-out, and corrections are reversal or adjustment entries.
  Ledger entries cannot be edited or deleted.
- **Money is calculated by the backend.** Line totals, fuel totals, lot balances and payment limits are computed and
  validated server-side. Amounts are stored in rupees rounded to two decimals.
- **Nothing important is deleted.** Records are deactivated, not removed. Paid reimbursements and lots with payments
  cannot be cancelled. Lot payments are appended, never overwritten.
- **Authentication** is a JWT in the `Authorization` header. The old cookie that held the user's e-mail is gone.
  Invoice files are only served to signed-in users.

## API overview (current)

All routes are under `/api` and need a Bearer token except `POST /auth/login` and `GET /health`.

| Area | Endpoints | Access |
|---|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` | all |
| Users | `GET/POST /users`, `PUT/DELETE /users/:id`, `POST /users/:id/reset-password` | admin |
| Vendors, item types, vehicles | `GET/POST /…`, `GET/PUT/DELETE /…/:id`, `POST /…/:id/reactivate` | read: all, write: admin |
| Lots | `GET/POST /lots`, `GET/PUT/DELETE /lots/:id`, `POST /lots/:id/receive`, `/payments`, `/mark-clear` | admin |
| Inventory | `GET /inventory`, `GET /inventory/transactions`, `POST /inventory/adjustments` | admin |
| Item requests | `GET/POST /item-requests`, `POST /item-requests/:id/approve`, `/reject` | staff create and see own, admin decides |
| Reimbursements | `GET/POST /reimbursements`, `…/:id/approve`, `/reject`, `/pay`, `GET /reimbursements/summary` | staff create and see own, admin decides |
| Fuel | `GET/POST /fuel`, `PUT/DELETE /fuel/:id` | staff create and see own, admin all |
| Vendor summary | `GET /vendors/:id/summary` | admin |
| Exports | `GET /exports/investor-sheet`, `GET /exports/inventory-sheet` (`?from=&to=`) | admin |
| Dashboard | `GET /dashboard/summary` | all (content depends on role) |

Responses use `{ success, data, meta }`; errors use `{ success: false, message, errors? }`.

## Screens (current)

Dashboard, Stock (with adjustments), Stock ledger, Purchases (list, new purchase with line items and invoice upload,
detail with payments, receive and cancel), Item requests, Item types, Reimbursements (request, approve, reject, pay),
Fuel, Vehicles, Vendors (with purchase summary), Excel exports, Users (add, edit, reset password, deactivate).
Staff see Item requests, Reimbursements, Fuel and Vendors; everything else is administrator only.

## Screenshots

To be added once the remaining screens are built.

## Security note

The original project contained a MongoDB Atlas connection string, mail passwords and a session secret in source
files. None of that was carried over, but those credentials were exposed in the original archive and should be rotated.
