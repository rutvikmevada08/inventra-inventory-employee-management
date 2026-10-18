const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, adminOnly } = require('../middleware/auth');
const { uploadInvoice } = require('../middleware/upload');
const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const vendors = require('../controllers/vendorController');
const itemTypes = require('../controllers/itemTypeController');
const vehicles = require('../controllers/vehicleController');
const lots = require('../controllers/lotController');
const inventory = require('../controllers/inventoryController');
const itemRequests = require('../controllers/itemRequestController');
const reimbursements = require('../controllers/reimbursementController');
const fuel = require('../controllers/fuelController');
const dashboard = require('../controllers/dashboardController');
const exportsCtl = require('../controllers/exportController');
const files = require('../controllers/fileController');
const employees = require('../controllers/employeeController');
const attendance = require('../controllers/attendanceController');
const advances = require('../controllers/advanceController');
const payroll = require('../controllers/payrollController');
const payments = require('../controllers/paymentController');
const expenses = require('../controllers/expenseController');
const reports = require('../controllers/reportController');

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

// Slows down password guessing. Tests raise the limit through the env var.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in a few minutes.' },
});
router.post('/auth/login', loginLimiter, auth.login);

// Everything below needs a valid token.
router.use(authenticate);
router.get('/auth/me', auth.me);
router.post('/auth/change-password', auth.changePassword);
router.get('/dashboard', dashboard.summary);
router.get('/dashboard/summary', dashboard.summary);
router.get('/files/:name', files.serve);

// Lookup lists are readable by staff (they need them for request and fuel forms); writes are admin only.
const lookup = (path, ctl) => {
  router.get(path, ctl.list);
  router.get(`${path}/:id`, ctl.get);
  router.post(path, adminOnly, ctl.create);
  router.put(`${path}/:id`, adminOnly, ctl.update);
  router.delete(`${path}/:id`, adminOnly, ctl.deactivate);
  router.post(`${path}/:id/reactivate`, adminOnly, ctl.reactivate);
};
lookup('/vendors', vendors);
router.get('/vendors/:id/summary', adminOnly, vendors.summary);
lookup('/item-types', itemTypes);
lookup('/vehicles', vehicles);

// User accounts
router.get('/users', adminOnly, users.list);
router.post('/users', adminOnly, users.create);
router.put('/users/:id', adminOnly, users.update);
router.put('/users/:id/toggle', adminOnly, users.toggle);
router.post('/users/:id/reset-password', adminOnly, users.resetPassword);
router.delete('/users/:id', adminOnly, users.deactivate);
router.post('/users/:id/reactivate', adminOnly, users.reactivate);

// Aliases for /auth/users
router.get('/auth/users', adminOnly, users.list);
router.post('/auth/users', adminOnly, users.create);
router.put('/auth/users/:id/toggle', adminOnly, users.toggle);
router.put('/auth/users/:id', adminOnly, users.update);
router.delete('/auth/users/:id', adminOnly, users.deactivate);

// Lots & Purchasing
router.get('/lots', adminOnly, lots.list);
router.post('/lots', adminOnly, uploadInvoice, lots.create);
router.get('/lots/:id', adminOnly, lots.get);
router.put('/lots/:id', adminOnly, lots.update);
router.put('/lots/:id/invoice', adminOnly, uploadInvoice, lots.replaceInvoice);
router.post('/lots/:id/receive', adminOnly, lots.receive);
router.post('/lots/:id/payments', adminOnly, lots.addPayment);
router.post('/lots/:id/payment', adminOnly, lots.addPayment);
router.post('/lots/:id/mark-clear', adminOnly, lots.markClear);
router.delete('/lots/:id', adminOnly, lots.deactivate);

// Aliases for /inventory/lots and /inventory/item-types
router.get('/inventory/lots', adminOnly, lots.list);
router.post('/inventory/lots', adminOnly, uploadInvoice, lots.create);
router.get('/inventory/lots/:id', adminOnly, lots.get);
router.put('/inventory/lots/:id', adminOnly, lots.update);
router.post('/inventory/lots/:id/receive', adminOnly, lots.receiveLegacy);
router.post('/inventory/lots/:id/payments', adminOnly, lots.addPayment);
router.post('/inventory/lots/:id/payment', adminOnly, lots.addPayment);
router.post('/inventory/lots/:id/mark-clear', adminOnly, lots.markClear);
router.delete('/inventory/lots/:id', adminOnly, lots.deactivate);
router.get('/inventory/item-types', itemTypes.list);
router.post('/inventory/item-types', adminOnly, itemTypes.create);

// Inventory Stock & Ledger
router.get('/inventory', adminOnly, inventory.stockList);
router.get('/inventory/stock', adminOnly, inventory.stockList);
router.get('/inventory/transactions', adminOnly, inventory.transactions);
router.get('/inventory/ledger', adminOnly, inventory.transactions);
router.post('/inventory/adjustments', adminOnly, inventory.adjust);

// Item Requests
router.get('/item-requests', itemRequests.list);
router.post('/item-requests', itemRequests.create);
router.post('/item-requests/:id/approve', adminOnly, itemRequests.approve);
router.post('/item-requests/:id/reject', adminOnly, itemRequests.reject);
router.post('/item-requests/:id/issue', adminOnly, itemRequests.issue);

// Reimbursements
router.get('/reimbursements', reimbursements.list);
router.get('/reimbursements/summary', reimbursements.summary);
router.get('/reimbursements/:id', reimbursements.get);
router.post('/reimbursements', uploadInvoice, reimbursements.create);
router.put('/reimbursements/:id', adminOnly, reimbursements.update);
router.post('/reimbursements/:id/approve', adminOnly, reimbursements.approve);
router.post('/reimbursements/:id/reject', adminOnly, reimbursements.reject);
router.post('/reimbursements/:id/pay', adminOnly, reimbursements.pay);
router.delete('/reimbursements/:id', adminOnly, reimbursements.deactivate);

// Fuel
router.get('/fuel', fuel.list);
router.post('/fuel', uploadInvoice, fuel.create);
router.put('/fuel/:id', adminOnly, fuel.update);
router.delete('/fuel/:id', adminOnly, fuel.deactivate);

// Workforce: Employees
router.get('/employees', employees.list);
router.post('/employees', adminOnly, employees.create);
router.get('/employees/:id', employees.get);
router.put('/employees/:id', adminOnly, employees.update);
router.delete('/employees/:id', adminOnly, employees.deactivate);
router.post('/employees/:id/reactivate', adminOnly, employees.reactivate);
router.get('/employees/:id/financial-summary', employees.financialSummary);

// Workforce: Attendance & Daily Wages
router.get('/attendance', attendance.list);
router.get('/attendance/status', attendance.dailyStatus);
router.get('/attendance/wages', attendance.wages);
router.post('/attendance', adminOnly, attendance.record);
router.post('/attendance/bulk', adminOnly, attendance.bulk);

// Workforce: Advances
router.get('/advances', advances.list);
router.post('/advances', adminOnly, advances.create);
router.delete('/advances/:id', adminOnly, advances.cancel);

// Workforce: Payroll
router.get('/payroll', payroll.list);
router.get('/payroll/:id', payroll.get);
router.post('/payroll/generate', adminOnly, payroll.generate);
router.post('/payroll/:id/finalize', adminOnly, payroll.finalize);
router.post('/payroll/:id/unfinalize', adminOnly, payroll.unfinalize);

// Workforce: Payments
router.get('/payments', payments.list);
router.post('/payments', adminOnly, payments.create);
router.post('/payments/:id/void', adminOnly, payments.void);

// Operating Expenses
router.get('/expenses', expenses.list);
router.post('/expenses', uploadInvoice, expenses.create);
router.put('/expenses/:id', adminOnly, expenses.update);
router.delete('/expenses/:id', adminOnly, expenses.delete);

// Reports and Exports
router.get('/reports/data', adminOnly, reports.data);
router.get('/reports/export/excel', adminOnly, reports.exportExcel);
router.get('/reports/export/pdf', adminOnly, reports.exportPdf);
router.get('/reports/investor-sheet', adminOnly, reports.investorSheet);
router.get('/reports/inventory-sheet', adminOnly, reports.inventorySheet);
router.all('/reports/legacy/inventory-sheet', adminOnly, reports.legacyInventorySheet);
router.all('/reports/legacy/investor-sheet', adminOnly, reports.legacyInvestorSheet);
router.get('/exports/investor-sheet', adminOnly, exportsCtl.investorSheet);
router.get('/exports/inventory-sheet', adminOnly, exportsCtl.inventorySheet);

module.exports = router;
