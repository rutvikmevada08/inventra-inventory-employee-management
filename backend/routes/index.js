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

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

// Slows down password guessing. Tests raise the limit through the env var.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.LOGIN_RATE_LIMIT) || 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Try again in a few minutes.' } });
router.post('/auth/login', loginLimiter, auth.login);

// Everything below needs a valid token.
router.use(authenticate);
router.get('/auth/me', auth.me);
router.post('/auth/change-password', auth.changePassword);
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

router.get('/users', adminOnly, users.list);
router.post('/users', adminOnly, users.create);
router.put('/users/:id', adminOnly, users.update);
router.post('/users/:id/reset-password', adminOnly, users.resetPassword);
router.delete('/users/:id', adminOnly, users.deactivate);
router.post('/users/:id/reactivate', adminOnly, users.reactivate);

router.get('/lots', adminOnly, lots.list);
router.post('/lots', adminOnly, uploadInvoice, lots.create);
router.get('/lots/:id', adminOnly, lots.get);
router.put('/lots/:id', adminOnly, lots.update);
router.put('/lots/:id/invoice', adminOnly, uploadInvoice, lots.replaceInvoice);
router.post('/lots/:id/receive', adminOnly, lots.receive);
router.post('/lots/:id/payments', adminOnly, lots.addPayment);
router.post('/lots/:id/mark-clear', adminOnly, lots.markClear);
router.delete('/lots/:id', adminOnly, lots.deactivate);

router.get('/inventory', adminOnly, inventory.stockList);
router.get('/inventory/transactions', adminOnly, inventory.transactions);
router.post('/inventory/adjustments', adminOnly, inventory.adjust);

router.get('/item-requests', itemRequests.list);
router.post('/item-requests', itemRequests.create);
router.post('/item-requests/:id/approve', adminOnly, itemRequests.approve);
router.post('/item-requests/:id/reject', adminOnly, itemRequests.reject);

router.get('/reimbursements', reimbursements.list);
router.get('/reimbursements/summary', reimbursements.summary);
router.get('/reimbursements/:id', reimbursements.get);
router.post('/reimbursements', uploadInvoice, reimbursements.create);
router.put('/reimbursements/:id', adminOnly, reimbursements.update);
router.post('/reimbursements/:id/approve', adminOnly, reimbursements.approve);
router.post('/reimbursements/:id/reject', adminOnly, reimbursements.reject);
router.post('/reimbursements/:id/pay', adminOnly, reimbursements.pay);
router.delete('/reimbursements/:id', adminOnly, reimbursements.deactivate);

router.get('/fuel', fuel.list);
router.post('/fuel', uploadInvoice, fuel.create);
router.put('/fuel/:id', adminOnly, fuel.update);
router.delete('/fuel/:id', adminOnly, fuel.deactivate);

router.get('/exports/investor-sheet', adminOnly, exportsCtl.investorSheet);
router.get('/exports/inventory-sheet', adminOnly, exportsCtl.inventorySheet);

module.exports = router;
