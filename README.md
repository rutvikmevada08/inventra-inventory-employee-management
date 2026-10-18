# Inventory & Workforce Management System

A web application for managing inventory, purchasing, employees, attendance, wages, and everyday business expenses in one place.

The aim is simple: make day-to-day records easier to maintain, understand where stock goes, calculate wages consistently, and keep a reliable history of payments and business activity.

## Features

### Dashboard
- Inventory and workforce summaries.
- Payroll and wage information.
- A simple chart for reviewing wage trends.

### Inventory and purchasing
- Item types and stock records.
- Purchase lots and invoice handling.
- Stock receiving and stock-out tracking.
- Item requests, approvals, and issuance.
- An inventory ledger for tracing stock movements.
- Duplicate-invoice protection and stock availability checks.

### Employees and attendance
- Employee records kept separate from login accounts.
- Employee codes, contact details, department, designation, joining date, and pay type.
- Daily attendance: present, half day, absent, and leave.
- Daily sheets, monthly summaries, date filters, and employee history.
- Deactivation instead of deleting important employee records.

### Wages, payroll, advances, and payments
- Daily-wage calculations based on eligible attendance.
- Monthly payroll generation and finalization.
- Advance tracking and payroll deductions.
- Partial and final wage payments.
- Remaining-balance calculations and payment history.
- Void/reversal records for corrections, with reasons retained for auditing.

Payroll calculations are handled by the backend. Finalized payroll figures are locked; use the supported reversal process to correct them rather than silently changing historical records.

### Business operations
- Vendors.
- Vehicles and fuel logs.
- Reimbursements.
- General operating expenses.

### Reports and exports
Reports cover inventory, stock movements, employees, attendance, daily wages, monthly payroll, advances, payments, expenses, and fuel consumption.

- Export supported reports to Excel (`.xlsx`) and PDF (`.pdf`).
- Existing investor and inventory Excel exports are retained.

### Authentication and access
- JWT-based authentication.
- Password hashing.
- Admin and staff roles.
- Staff access restricted to the modules intended for staff.
- Protected access to uploaded invoices and private files.

## Tech stack

- **Frontend:** React, Vite, React Router, Axios, custom CSS, and Recharts.
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT authentication, bcryptjs, Helmet, ExcelJS, and PDFKit.
- **Architecture:** Consolidated single REST API backend (`backend/` and Express API) serving the React Single Page Application (`frontend/`).

## Project structure

```text
inventory_management/
├── backend/                  # Consolidated Node.js / Express REST API
│   ├── config/               # Environment and MongoDB connection setup
│   ├── controllers/          # Business logic and request handlers
│   ├── middleware/           # JWT auth, role guard, upload & error handling
│   ├── models/               # Mongoose schemas (Workforce, Inventory, Finance)
│   ├── routes/               # Centralized REST API routing
│   ├── scripts/              # Admin provisioning & dry-run legacy migration
│   ├── services/             # Analytics, report and export engines
│   └── tests/                # Automated backend test suites (77 tests)
├── frontend/                 # React + Vite frontend SPA
│   ├── src/
│   │   ├── components/       # Reusable UI controls, tables, modals, feedback
│   │   ├── context/          # AuthContext (JWT session management)
│   │   ├── layouts/          # Responsive AppLayout and role-filtered navigation
│   │   ├── pages/            # Workforce, Inventory, Operations, and Reports views
│   │   ├── services/         # Unified Axios client and API integration
│   │   └── test/             # Vitest frontend automated test suites (39 tests)
│   └── dist/                 # Production build assets
├── test/
│   └── run-all-tests.js      # End-to-end integration test runner (36 tests)
├── public/uploads/           # Invoices and receipts
├── .env.example              # Environment variable template
├── package.json              # Unified root scripts
└── README.md
```

## Requirements

- Node.js (a current LTS release is recommended)
- npm
- MongoDB Atlas or MongoDB Community Server

You do not need to run a local MongoDB server if you use Atlas.

## Setup

### 1. Open the project

Clone your repository or open the project folder in a terminal:

```bash
cd inventory_management
```

### 2. Install dependencies

Run these commands from the project root:

```bash
npm install
npm --prefix frontend install
```

### 3. Configure MongoDB

MongoDB Atlas is supported:

1. Create a cluster in your Atlas account.
2. Create a database user and password.
3. Add your current IP address under **Network Access**.
4. Open **Connect → Drivers** and copy the Node.js connection string.
5. Include the database name you want to use.

A connection string generally looks like this:

```text
mongodb+srv://<username>:<password>@<cluster-host>/inventory_management?retryWrites=true&w=majority
```

Replace the placeholders with your own Atlas values. If your password contains reserved URL characters, encode them before placing it in the URI.

Keep your real connection string private.

### 4. Configure environment variables

Copy `.env.example` to `.env` in the project root.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Open `.env` and set the values required by the application. At minimum, check `MONGODB_URI` and `JWT_SECRET`. Use the exact variable names documented in `.env.example` and the server configuration.

Example only:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/inventory_management?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_random_secret
PORT=5000
```

This example is illustrative. Keep any other required variables from `.env.example`; do not guess variable names. Never commit `.env`.

### 5. Initialize the database

First, confirm that `MONGODB_URI` points to your own intended database. Then run:

```bash
npm run seed
```

The seed script initializes default application data, including initial user accounts and standard inventory item types. Check `scripts/seed.js` and its terminal output for the exact seed behavior and login details.

Only run the seed against a database you intend to initialize. Do not run it against a legacy or production database without reviewing the script and making an appropriate backup.

## Run the application
 
Use two terminals during development:

### Terminal 1: backend

From the project root:

```bash
npm run dev:backend
```

(Or `npm --prefix backend run dev`). The backend listens on port `5000` (or `PORT` specified in `.env`).

### Terminal 2: frontend

From the project root:

```bash
npm run dev:frontend
```

(Or `npm --prefix frontend run dev`). Vite serves the frontend at `http://localhost:5173`.

---

## Production build & deployment

Build the frontend:

```bash
npm run build
```

Then start the application:

```bash
npm start
```

The Express server serves the compiled SPA from `frontend/dist/` alongside the API endpoints on port `5000` (http://localhost:5000).

---

## Automated tests

Run the complete verification test suite:

```bash
npm test
```

This runs:
1. End-to-end integration tests: `npm run test:integration` (36 tests)
2. Backend REST API test runner: `npm run test:backend` (77 tests)
3. Frontend Vitest component tests: `npm run test:frontend` (39 tests)

Total automated test coverage across the consolidated architecture: **152 passing tests, 0 failures**.

Build the frontend separately if needed:

```bash
npm run build
```

Use a separate test database for database-specific testing. Never point tests at a database containing production or business data. If the test suite supports `TEST_MONGODB_URI`, set it to a dedicated test database according to the test configuration.

## Main workflows

### Inventory

1. Create or select a purchase lot.
2. Record the received items.
3. Review the stock ledger and current stock.
4. Submit an item request.
5. Approve the request with the appropriate role.
6. Issue the items and verify the stock-out entry.

Stock movements should be traceable through inventory transactions, not unexplained changes to a total.

### Employee wages

1. Create an employee record.
2. Record attendance for the relevant dates.
3. Generate payroll for the employee and month.
4. Review and finalize the calculated figures.
5. Record advances and payments as appropriate.
6. Use payment history to check the remaining balance.

The basic calculations for daily-wage employees are:

```text
Gross wage = Eligible days × Daily wage
Net payable = Gross wage − Advances − Deductions
Remaining balance = Net payable − Valid payments
```

Present counts as one eligible day, half day as half a day, and absent or unpaid leave as zero eligible days. The backend is the source of truth for calculations.

## Data integrity and migration

The application is designed to retain an audit trail for important inventory and financial activity:

- Historical payments should be voided or reversed through supported actions, not physically deleted.
- Payroll corrections should use the supported reversal process.
- Inventory movements should remain traceable.
- Important records use deactivation or reversal where appropriate.
- Database indexes protect key operations from duplicate records.

The legacy migration script is **dry-run by default**. Review `scripts/MIGRATION.md` and the migration script before using it. Test migration against a copy of the old data first, inspect the report, and use the explicit `--apply` option only after confirming the target database and migration plan.

Do not assume a migration has completed just because the application starts.

## Uploaded invoices and deployment

The existing `public/uploads/` directory contains legacy invoices and receipts and is intentionally excluded from normal Git commits.

- Do not delete or replace these files during cleanup.
- Keep a backup before moving or deploying the project.
- For cloud deployment, use persistent storage and copy or mount the existing files as needed.
- Confirm that file access rules work in the deployed environment.
- Do not rely on an ephemeral container filesystem for permanent invoice storage.

## Security checklist

Before deploying publicly or making the repository public:

- Keep `.env` out of Git.
- Use a long, randomly generated JWT secret.
- Give the MongoDB database user only the permissions the app needs.
- Restrict Atlas Network Access rather than leaving broad access enabled indefinitely.
- Change or remove development/default login credentials.
- Confirm no real passwords, connection strings, API keys, or private files are tracked by Git.
- Configure the allowed frontend origin correctly.
- Use HTTPS in production.
- Keep dependencies updated and review authentication and file-access behavior before deployment.

Do not publish real business invoices or customer or employee information in the repository.

## Current limitations

The Antigravity report notes that some areas still need real-world verification:

- Check the user interface and mobile layout in a browser.
- Migration has not been verified on the actual legacy business database.
- Re-run tests against the MongoDB version used by your deployment.
- Paid leave, holidays and weekly offs, automatic monthly-salary proration, statutory deductions, and email-based password reset are not modelled.
- Existing uploaded files require persistent storage when deployed.

Review these limitations against your business requirements before using the system for live financial operations.

## Contributing

1. Create a branch for your changes.
2. Keep secrets and private business data out of commits.
3. Run the backend tests, frontend tests, and production build.
4. Test the affected business workflow before opening a pull request.
5. Document changes to environment variables or setup commands.

## License

Add the license you intend to use before distributing this project publicly.
