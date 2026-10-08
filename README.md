# Smart Inventory & Workforce Management System

An internal enterprise system combining inventory management, vendor procurement, stock movement ledgers, workforce attendance, daily wage calculations, monthly payroll, advance payments, fleet fuel tracking, expense claims, and document reporting.

---

## 1. Project Purpose & Overview

The **Smart Inventory & Workforce Management System** is designed for operations-heavy organizations employing daily-wage and monthly workforce alongside equipment, vehicles, and hardware inventory.

### Key Capabilities
- **Workforce Management**: Employee directory, daily wage rates, joining history, and soft-deactivation (preserving historical auditable records).
- **Daily Attendance**: Four-state attendance tracking (Present = 1.0 day, Half Day = 0.5 day, Absent = 0.0, Leave = 0.0) with duplicate-date prevention via compound unique indexes.
- **Daily Wage Engine**: Server-side wage calculations where eligible days are multiplied by employee daily wage rates.
- **Monthly Payroll**: Automated generation of draft payrolls, automatic aggregation and deduction of pending advances, finalization locking, and explicit reversal/correction workflows.
- **Advance Payments**: Append-only advance disbursements with audit tracking and automatic reconciliation into payroll.
- **Wage Disbursements**: Partial and multiple wage payments against finalized payrolls, strict overpayment rejection, and auditable voiding.
- **Inventory & Stock Ledger**: Double-entry style stock ledger tracking every unit received from purchase lots and issued to workforce requests.
- **Purchases & Lots**: Multi-item purchase invoices with supplier attachment, document upload, stock receiving into inventory, and part payments.
- **Material Requisitions**: Workforce item requests with administrative approval and direct stock-out issuance to ledger.
- **Operations & Fleet**: Vendor directory, fleet vehicle registry, fuel purchase tracking with invoice capture, and 4-stage reimbursement claims (Requested &rarr; Approved &rarr; Paid &rarr; Locked).
- **Reporting & Exports**: 11 real-time reports with Excel (`.xlsx`) export via ExcelJS, PDF report generation via PDFKit, and preservation of legacy investor/inventory spreadsheet layouts.
- **Role-Based Security**: JWT authentication with bcrypt password hashing, separating system login users (Admin/Staff) from workforce labour records.

---

## 2. Technology Stack

- **Backend**: Node.js, Express.js, MongoDB, Mongoose 8
- **Authentication**: JSON Web Tokens (JWT), bcryptjs (10 salt rounds)
- **Frontend**: React 19, Vite 8, React Router v7, Axios, Custom Plain CSS (Light, Business UI - No Bootstrap, No Tailwind CSS)
- **Document & Spreadsheet Generation**: PDFKit, ExcelJS
- **File Uploads**: Multer (collision-safe unique file naming, strict type and size validation)
- **Testing**: Supertest, Node Test Runner, Vitest, JSDOM

---

## 3. Architecture & User vs. Employee Model

The application strictly separates **Authentication Users** from **Workforce Labour Records**:
- **User (`models/User.js`)**: Represents persons who can authenticate into the application. Roles: `admin` (full permissions) and `staff` (restricted to Item Requests, Reimbursements, Fuel, and Vendors).
- **Employee (`models/employees.js`)**: Represents physical workers, technicians, and labourers. An employee can exist without a login account, receives daily wages, takes advances, appears in payroll, and receives payments. Can optionally be linked to a User account.

```
Workforce Flow:
Employee Directory
       ↓
Daily Attendance (Present / Half Day / Absent / Leave)
       ↓
Daily Wage Engine (eligible_days = Present*1 + Half*0.5)
       ↓
Monthly Payroll (Draft: Gross = eligible_days × rate)
       ↓
Advances Deducted (Eligible advances subtracted from Gross)
       ↓
Net Payable (Finalized & Locked)
       ↓
Wage Disbursements (Partial or full payments; Overpayment protected)
       ↓
Paid & Settled
```

```
Inventory Flow:
Catalog Item Types
       ↓
Purchase Lot & Invoice (Vendor + Items + Upload)
       ↓
Stock Receiving (Triggers STOCK_IN on Inventory Ledger)
       ↓
Available Stock on Hand (Derived from ledger)
       ↓
Workforce Item Request (Requisition)
       ↓
Admin Approval & Issuance (Triggers STOCK_OUT on Inventory Ledger)
```

---

## 4. Folder Structure

```
inventory_management/
├── bin/
│   └── www                    # Express server entrypoint & port binding
├── frontend/                  # React + Vite frontend application
│   ├── src/
│   │   ├── __tests__/         # Frontend Vitest component & role tests
│   │   ├── components/        # Navbar, Sidebar, Modal, Feedback states
│   │   ├── context/           # AuthContext (JWT session state)
│   │   ├── pages/             # Dashboard, Workforce, Inventory, Operations, Reports
│   │   ├── api.js             # Axios client with JWT interceptor
│   │   ├── App.jsx            # React Router shell & protected routes
│   │   └── index.css          # Plain custom CSS design system
│   ├── vite.config.js         # Vite configuration with API proxy & test env
│   └── package.json           # Frontend dependencies
├── middleware/
│   ├── auth.js                # JWT verification and requireAdmin guards
│   └── upload.js              # Multer storage with unique timestamps & mime filter
├── models/
│   ├── Advance.js             # Append-only advance payments
│   ├── Attendance.js          # Daily attendance with compound unique index
│   ├── Employee.js / employees.js # Workforce profiles & wage rates
│   ├── Expense.js             # General operating business expenses
│   ├── fuel.js                # Fleet refuel logs & receipts
│   ├── InventoryLedger.js     # Immutable stock movement ledger
│   ├── item_req.js            # Workforce material requisitions
│   ├── item_types.js          # Catalog inventory classifications
│   ├── items.js               # Lot line items
│   ├── lots.js                # Purchase lots & invoice records
│   ├── Payment.js             # Employee wage disbursements & voiding
│   ├── Payroll.js             # Monthly payroll ledger with locking
│   ├── reimbursement.js       # 4-stage reimbursement claims
│   ├── User.js                # Authentication accounts (Admin/Staff)
│   ├── vehicles.js            # Fleet vehicles
│   └── vendors.js             # Supplier & vendor directory
├── public/
│   └── uploads/               # Uploaded invoices & receipts (preserved)
├── routes/
│   ├── api/                   # REST API routes
│   │   ├── auth.js
│   │   ├── employees.js
│   │   ├── attendance.js
│   │   ├── payroll.js
│   │   ├── advances.js
│   │   ├── payments.js
│   │   ├── inventory.js
│   │   ├── itemRequests.js
│   │   ├── vendors.js
│   │   ├── vehicles.js
│   │   ├── fuel.js
│   │   ├── reimbursements.js
│   │   ├── expenses.js
│   │   ├── dashboard.js
│   │   ├── reports.js
│   │   └── files.js
│   └── index.js               # Legacy routes preserved
├── scripts/
│   ├── migrate-legacy.js      # Safe migration script (Dry-run by default)
│   ├── MIGRATION.md           # Migration safety guidelines
│   └── seed.js                # Database seed script for initial admin & items
├── test/
│   └── run-all-tests.js       # End-to-end automated integration test suite
├── app.js                     # Express app configuration & middleware
├── .env.example               # Environment variable template
├── .gitignore                 # Excludes node_modules, .env, build files
└── README.md                  # Comprehensive project documentation
```

---

## 5. Prerequisites & Database Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (Tested on Node.js v24)
- **MongoDB**: MongoDB Community Server v6.0+ or MongoDB Atlas cluster.
  *(Note: FerretDB is not recommended for production due to sparse unique index and aggregation pipeline constraints).*

### MongoDB Community Server Setup (Local)
1. Install MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community).
2. Start the MongoDB service:
   - **Windows**: `Start-Service MongoDB` (runs as a Windows Service on `127.0.0.1:27017`).
   - **Linux / macOS**: `sudo systemctl start mongod` or `brew services start mongodb-community`.
3. Verify connection:
   ```bash
   mongosh --eval "db.adminCommand('ping')"
   ```

### MongoDB Atlas Setup (Cloud)
1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user and whitelist your server's IP address (or `0.0.0.0/0` during initial setup).
3. Copy your connection string into `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/inventory_management?retryWrites=true&w=majority
   ```

---

## 6. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/inventory_management

# Authentication
JWT_SECRET=replace_with_a_secure_random_string_min_32_chars

# Server Configuration
PORT=5000
CLIENT_URL=http://localhost:5173

# Business Defaults
COMPANY_NAME=Swaayatt Robots
DEFAULT_PAYER=Sanjeev Sharma

# SMTP Email Configuration (Optional - for email notifications)
SMTP_HOST=smtppro.zoho.in
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
```

---

## 7. Installation & Seeding

1. **Install Backend Dependencies**:
   ```bash
   npm install
   ```

2. **Install Frontend Dependencies**:
   ```bash
   npm --prefix frontend install
   ```

3. **Seed Initial Administrator & Catalog Items**:
   ```bash
   npm run seed
   ```
   This creates:
   - **Default Admin Account**: `admin@company.com` / `Admin@123`
   - **Default Staff Account**: `staff@company.com` / `Staff@123`
   - Initial 36 standard engineering item classifications.

---

## 8. Running the Application

### Development Mode (Concurrent Frontend + Backend)

Start the Express API backend:
```bash
npm run server
```
*Backend runs on `http://localhost:5000`.*

In a separate terminal, start the Vite development server:
```bash
npm run client
```
*Frontend runs on `http://localhost:5173` with automated API proxying.*

### Production Mode

1. **Build the Frontend**:
   ```bash
   npm run build
   ```
   *Compiles React application into `frontend/dist`.*

2. **Start the Production Server**:
   ```bash
   npm start
   ```
   *Express automatically serves the React production bundle, handles SPA client routing, and secures `/api` routes on port `5000`.*

---

## 9. Testing & Quality Assurance

### Run Backend & End-to-End Workflow Tests
```bash
npm test
```
The test suite executes 36 automated verification steps against real MongoDB:
- Authentication & JWT issuance
- Role-based authorization & staff route blocking
- Workforce registration & daily wage configuration
- Attendance eligible days calculation (`Present` = 1.0, `Half Day` = 0.5)
- Duplicate attendance rejection via unique compound index
- Server-side daily wages computation
- Monthly payroll generation (`Gross` &ndash; `Advances` = `Net Payable`)
- Finalization locking of payroll and deduction of pending advances
- Partial disbursements and overpayment rejection
- Settlement to `Paid` status and payment voiding / balance reopening
- Catalog item creation and multi-item purchase lots
- Stock receiving (`STOCK_IN`) and stock ledger balance updates
- Duplicate stock receipt rejection
- Material requests and stock-out issuance (`STOCK_OUT`)
- Vehicle registry, refuel logs, and fuel expense aggregations
- 4-stage reimbursement claims (`Requested` &rarr; `Approved` &rarr; `Paid` &rarr; `Locked`)
- Operational expenses tracking
- All 11 report analytics compilations
- Excel (`.xlsx`) export generation
- PDF report generation
- Preserved legacy inventory spreadsheet export

### Run Frontend Component & Accessibility Tests
```bash
npm --prefix frontend test
```
Runs Vitest and JSDOM component tests verifying login inputs, role-based navigation rendering, and clean UI without emojis.

---

## 10. Data Migration (Safe Dry-Run by Default)

The migration utility safely transfers records from legacy databases.

### Safety Principles
1. **Dry-Run by Default**: Inspects legacy documents and files without modifying any database.
2. **Explicit Opt-in**: Modifications are only applied when `--apply` is passed.
3. **Never Deletes Legacy Data**: Legacy collections remain untouched.
4. **Bcrypt Hashing**: Plaintext passwords from the legacy system are automatically hashed with 10 bcrypt salt rounds.
5. **Invoice File Integrity**: Verifies existing files in `public/uploads/` on disk without renaming or overwriting them.

```bash
# 1. Perform Dry-Run (Read-only)
node scripts/migrate-legacy.js

# 2. Apply Migration
node scripts/migrate-legacy.js --apply
```

---

## 11. Security Implementation

- **Password Security**: Passwords hashed with `bcryptjs` (salt factor 10).
- **JWT Authorization**: 12-hour signed JWT tokens with user payload and role enforcement.
- **Role-Based Guards**: Backend middleware (`requireAdmin`, `requireStaffOrAdmin`) protects sensitive employee wages, payroll, and payment management.
- **Secure File Uploads**: Multer generates collision-safe filenames (`Date.now() + crypto.randomBytes`), enforces an extension whitelist (`.jpg`, `.jpeg`, `.png`, `.pdf`, `.webp`), and caps upload size at 25MB.
- **Private Document Delivery**: The `/api/files/uploads/:filename` route requires active JWT authentication to prevent public exposure of invoices.
- **Directory Traversal Protection**: File paths are sanitized using `path.basename`.
- **Zero Secrets in Repository**: No passwords, API keys, or database credentials are committed.

---

## 12. User Roles & Permissions Matrix

| Module / Action | Staff | Administrator |
|---|:---:|:---:|
| System Logins & Users | No | Full Access |
| Workforce Directory | View Only | Create, Edit, Deactivate |
| Attendance Tracking | View Only | Mark Daily, Bulk Update |
| Daily Wage Calculations | View Only | View, Filter |
| Monthly Payroll Ledger | No Access | Generate, Finalize, Unlock |
| Advance Wage Payments | No Access | Disburse, Reconcile |
| Wage Disbursements | No Access | Disburse, Void, Settle |
| Stock Overview | View | View |
| Stock Ledger (Audit) | No Access | Full Audit History |
| Purchase Lots & Receiving | No Access | Create Lot, Receive Stock |
| Catalog Item Types | View | Create, Manage |
| Material Requisitions | Submit Request | Approve, Reject, Issue Stock |
| Vendor Directory | View, Search | Register, Edit |
| Fleet Vehicles | View Only | Register, Manage |
| Fuel Purchase Logs | Log Refuel | Full Management & Totals |
| Expense Reimbursements | Submit Claim | Approve, Disburse, Lock |
| General Business Expenses | No Access | Record, Manage |
| Reports & Excel/PDF Exports | View, Export | Full Access |

---

## 13. GitHub Readiness Checklist

- [x] `.gitignore` configured to exclude `node_modules/`, `.env`, `dist/`, logs, and large archives
- [x] `.env.example` created with placeholders only
- [x] No hardcoded passwords, credentials, or secrets in code
- [x] Legacy ~92MB invoice files safely preserved in `public/uploads/` without Git tracking
- [x] Both backend and frontend automated test suites passing (36/36 backend tests, 5/5 frontend tests)
- [x] Production frontend build verified (`dist/index.html` built cleanly)
- [x] Migration script verified dry-run by default

---

## 14. License & Credits

Developed for internal operations and enterprise asset management. Proprietary business software.
