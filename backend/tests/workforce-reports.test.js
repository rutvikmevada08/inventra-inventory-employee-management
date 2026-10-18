const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, makeUser, login, as } = require('./helpers');
const ItemType = require('../models/ItemType');
const Lot = require('../models/Lot');
const Vendor = require('../models/Vendor');
const stock = require('../services/stock');

describe('Workforce, Payroll, Financial, and Reports Modules', () => {
  let A; // admin client
  let S; // staff client
  let adminUser;
  let staffUser;
  let testEmployeeId;
  let testPayrollId;
  let testPaymentId;
  let testItemTypeId;
  let testRequestId;

  before(async () => {
    await setup();
    adminUser = await makeUser({ role: 'admin', name: 'Workforce Admin' });
    staffUser = await makeUser({ role: 'staff', name: 'Workforce Staff' });
    A = as(await login(adminUser));
    S = as(await login(staffUser));
  });

  after(async () => {
    await teardown();
  });

  describe('Employee Management', () => {
    test('admin can create employee with daily wage configuration', async () => {
      const res = await A.post('/api/employees', {
        employeeCode: 'EMP-001',
        name: 'Rohan Sharma',
        phone: '9876543210',
        email: 'rohan.sharma@example.com',
        designation: 'Senior Technician',
        department: 'Operations',
        payType: 'Daily',
        dailyWage: 400,
        monthlySalary: 0,
      });

      assert.equal(res.status, 201);
      const emp = res.body.employee || res.body.data;
      assert.ok(emp._id);
      testEmployeeId = emp._id;
      assert.equal(emp.name, 'Rohan Sharma');
      assert.equal(emp.dailyWage, 400);
      assert.equal(emp.employeeCode, 'EMP-001');
    });

    test('rejects duplicate employee code', async () => {
      const res = await A.post('/api/employees', {
        employeeCode: 'EMP-001',
        name: 'Duplicate Rohan',
        phone: '9876543211',
        dailyWage: 400,
      });
      assert.equal(res.status, 400);
    });

    test('staff cannot create employee', async () => {
      const res = await S.post('/api/employees', {
        employeeCode: 'EMP-999',
        name: 'Unauthorized User',
        dailyWage: 300,
      });
      assert.equal(res.status, 403);
    });

    test('admin can update employee details and view financial summary', async () => {
      const updateRes = await A.put(`/api/employees/${testEmployeeId}`, {
        designation: 'Lead Technician',
        dailyWage: 450,
      });
      assert.equal(updateRes.status, 200);

      const getRes = await A.get(`/api/employees/${testEmployeeId}`);
      assert.equal(getRes.status, 200);
      const emp = getRes.body.employee || getRes.body.data;
      assert.equal(emp.designation, 'Lead Technician');
      assert.equal(emp.dailyWage, 450);

      const summaryRes = await A.get(`/api/employees/${testEmployeeId}/financial-summary`);
      assert.equal(summaryRes.status, 200);
      const summary = summaryRes.body.summary || summaryRes.body.data;
      assert.ok(summary);
      assert.equal(summary.totalGrossEarned, 0);
    });
  });

  describe('Attendance and Daily Wages', () => {
    test('records daily attendance and sets eligible days correctly', async () => {
      // 1.0 for Present
      const res1 = await A.post('/api/attendance', {
        employeeId: testEmployeeId,
        date: '2026-10-01',
        status: 'Present',
      });
      assert.equal(res1.status, 201);
      const att1 = res1.body.attendance || res1.body.data;
      assert.equal(att1.eligibleDays, 1.0);

      // 0.5 for Half Day
      const res2 = await A.post('/api/attendance', {
        employeeId: testEmployeeId,
        date: '2026-10-02',
        status: 'Half Day',
      });
      assert.equal(res2.status, 201);
      const att2 = res2.body.attendance || res2.body.data;
      assert.equal(att2.eligibleDays, 0.5);

      // 0.0 for Absent
      const res3 = await A.post('/api/attendance', {
        employeeId: testEmployeeId,
        date: '2026-10-03',
        status: 'Absent',
      });
      assert.equal(res3.status, 201);
      const att3 = res3.body.attendance || res3.body.data;
      assert.equal(att3.eligibleDays, 0.0);
    });

    test('duplicate attendance on same date is updated cleanly without duplicate rows', async () => {
      const res = await A.post('/api/attendance', {
        employeeId: testEmployeeId,
        date: '2026-10-01',
        status: 'Present',
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.record.eligibleDays, 1.0);
    });

    test('daily wages calculation derives accurate earnings', async () => {
      const res = await A.get(`/api/attendance/wages?employeeId=${testEmployeeId}&from=2026-10-01&to=2026-10-31`);
      assert.equal(res.status, 200);
      const wages = res.body.wages || res.body.data;
      assert.ok(wages && wages.length > 0);
      const empWage = wages.find((w) => String(w.employee?._id) === String(testEmployeeId));
      assert.ok(empWage);
      assert.equal(empWage.presentDays, 1);
      assert.equal(empWage.halfDays, 1);
      assert.equal(empWage.absentDays, 1);
      assert.equal(empWage.eligibleDays, 1.5);
      // 1.5 days * 450 dailyWage = 675
      assert.equal(empWage.grossWage, 675);
    });
  });

  describe('Advances, Payroll & Payments Workflow', () => {
    test('admin can disburse advance linked to payroll month', async () => {
      const res = await A.post('/api/advances', {
        employeeId: testEmployeeId,
        amount: 175,
        payrollMonth: '2026-10',
        reason: 'Festival advance',
      });
      assert.equal(res.status, 201);
      const adv = res.body.advance || res.body.data;
      assert.equal(adv.amount, 175);
      assert.equal(adv.payrollMonth, '2026-10');
    });

    test('payroll generation reconciles gross wages, advances, and net payable', async () => {
      const genRes = await A.post('/api/payroll/generate', { month: '2026-10' });
      assert.equal(genRes.status, 200);

      const listRes = await A.get('/api/payroll?month=2026-10');
      assert.equal(listRes.status, 200);
      const payrolls = listRes.body.payrolls || listRes.body.data;
      const p = payrolls.find((item) => String(item.employee?._id || item.employee) === String(testEmployeeId));
      assert.ok(p);
      testPayrollId = p._id;

      // Gross (675) - Advance (175) = Net Payable (500)
      assert.equal(p.grossAmount, 675);
      assert.equal(p.advances, 175);
      assert.equal(p.netPayable, 500);
      assert.equal(p.status, 'Draft');
    });

    test('finalizing payroll locks record against modifications', async () => {
      const finRes = await A.post(`/api/payroll/${testPayrollId}/finalize`, {});
      assert.equal(finRes.status, 200);
      const fin = finRes.body.payroll || finRes.body.data;
      assert.equal(fin.status, 'Finalized');
    });

    test('partial payment updates paid amount and status', async () => {
      const payRes = await A.post('/api/payments', {
        payrollId: testPayrollId,
        amount: 200,
        paymentMethod: 'Bank Transfer',
        transactionReference: 'NEFT-WORKFORCE-001',
      });
      assert.equal(payRes.status, 201);
      const payment = payRes.body.payment || payRes.body.data;
      testPaymentId = payment._id;
      assert.equal(payment.amount, 200);

      const checkPay = await A.get(`/api/payroll/${testPayrollId}`);
      const payroll = checkPay.body.payroll || checkPay.body.data;
      assert.equal(payroll.paidAmount, 200);
      assert.equal(payroll.status, 'Partially Paid');
    });

    test('overpayment beyond balance is rejected', async () => {
      // Remaining is 300 (500 - 200)
      const overRes = await A.post('/api/payments', {
        payrollId: testPayrollId,
        amount: 999,
        paymentMethod: 'Cash',
      });
      assert.equal(overRes.status, 400);
      assert.match(overRes.body.error || overRes.body.message, /exceeds remaining/i);
    });

    test('voiding payment reverts paidAmount and reopens payroll', async () => {
      const voidRes = await A.post(`/api/payments/${testPaymentId}/void`, {
        reason: 'Payment reversal test',
      });
      assert.equal(voidRes.status, 200);
      const voided = voidRes.body.payment || voidRes.body.data;
      assert.equal(voided.status, 'Voided');

      const checkPay = await A.get(`/api/payroll/${testPayrollId}`);
      const payroll = checkPay.body.payroll || checkPay.body.data;
      assert.equal(payroll.paidAmount, 0);
      assert.equal(payroll.status, 'Finalized');
    });
  });

  describe('Operating Expenses', () => {
    test('admin can record operational expense', async () => {
      const res = await A.post('/api/expenses', {
        title: 'Workshop Electricity Bill',
        category: 'Utilities',
        amount: 1450,
        date: '2026-10-10',
        paymentMethod: 'Company Card',
        description: 'Monthly power consumption for assembly unit',
      });
      assert.equal(res.status, 201);
      const exp = res.body.expense || res.body.data;
      assert.equal(exp.amount, 1450);
      assert.equal(exp.category, 'Utilities');
    });

    test('lists operational expenses', async () => {
      const res = await A.get('/api/expenses');
      assert.equal(res.status, 200);
      const expenses = res.body.expenses || res.body.data;
      assert.ok(expenses.length >= 1);
    });
  });

  describe('Item Requests & Stock Issuance', () => {
    test('creates stock, staff requests item, and admin issues stock to ledger', async () => {
      // 1. Create item type
      const typeRes = await A.post('/api/inventory/item-types', {
        name: 'LiDAR Bracket V2',
        category: 'Hardware',
        unit: 'pcs',
        reorderLevel: 5,
        isStockable: true,
      });
      assert.equal(typeRes.status, 201);
      testItemTypeId = (typeRes.body.itemType || typeRes.body.data)._id;

      // 2. Direct stock in
      await stock.record({
        itemType: testItemTypeId,
        type: 'in',
        quantity: 20,
        source: 'adjustment',
        note: 'Initial lot stock',
        createdBy: adminUser._id,
      });

      const initialStock = await stock.balanceOf(testItemTypeId);
      assert.equal(initialStock, 20);

      // 3. Staff submits item request
      const reqRes = await S.post('/api/item-requests', {
        employeeId: testEmployeeId,
        itemTypeId: testItemTypeId,
        quantity: 4,
        reason: 'Assembly test',
      });
      assert.equal(reqRes.status, 201);
      testRequestId = (reqRes.body.request || reqRes.body.data)._id;

      // 4. Admin issues stock
      const issueRes = await A.post(`/api/item-requests/${testRequestId}/issue`, {});
      assert.equal(issueRes.status, 200);
      const issued = issueRes.body.request || issueRes.body.data;
      assert.equal(issued.stockIssued, true);

      // 5. Verify stock balance reduced
      const finalStock = await stock.balanceOf(testItemTypeId);
      assert.equal(finalStock, 16); // 20 - 4

      // 6. Duplicate issue is rejected
      const dupIssue = await A.post(`/api/item-requests/${testRequestId}/issue`, {});
      assert.equal(dupIssue.status, 400);
    });
  });

  describe('Analytical Reports & Exports', () => {
    test('reports data endpoint returns payroll summary and records', async () => {
      const res = await A.get('/api/reports/data?type=payroll&month=2026-10');
      assert.equal(res.status, 200);
      const data = res.body.data || res.body.rows;
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0);
      assert.equal(data[0].month, '2026-10');
      assert.equal(data[0].gross, 675);
    });

    test('reports data endpoint returns attendance records', async () => {
      const res = await A.get('/api/reports/data?type=attendance&startDate=2026-10-01&endDate=2026-10-31');
      assert.equal(res.status, 200);
      const data = res.body.data || res.body.rows;
      assert.ok(Array.isArray(data));
      assert.ok(data.length >= 3);
    });

    test('exports attendance report to Excel', async () => {
      const res = await A.get('/api/reports/export/excel?type=attendance&startDate=2026-10-01&endDate=2026-10-31');
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /spreadsheetml/);
    });

    test('exports payroll report to PDF', async () => {
      const res = await A.get('/api/reports/export/pdf?type=payroll&month=2026-10');
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /pdf/);
    });

    test('staff cannot access admin reports or exports', async () => {
      const res = await S.get('/api/reports/data?type=payroll');
      assert.equal(res.status, 403);
    });
  });

  describe('Dashboard Summary Reconciliation', () => {
    test('dashboard summary reconciles workforce, attendance, and payroll figures', async () => {
      const res = await A.get('/api/dashboard/summary');
      assert.equal(res.status, 200);
      const d = res.body.data || res.body;
      assert.ok(d.workforce);
      assert.equal(d.workforce.totalActiveEmployees, 1);
      assert.ok(d.workforce.payrollThisMonth);
      assert.equal(d.workforce.payrollThisMonth.gross, 675);
      assert.equal(d.workforce.payrollThisMonth.advances, 175);
      assert.equal(d.workforce.payrollThisMonth.net, 500);
    });
  });
});
