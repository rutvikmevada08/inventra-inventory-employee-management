<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, ErrorMessage } from "../components/Feedback";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await API.get("/dashboard");
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner message="Compiling executive metrics..." />;

  const wf = data?.workforce || {};
  const ops = data?.operations || {};
  const att = wf.attendanceToday || {};
  const fin = wf.financials || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Management Dashboard</h1>
          <p className="page-desc">Overview of workforce operations, stock, and monthly financials</p>
        </div>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError("")} />

      {/* Workforce Summary (Only shown fully if admin or relevant stats) */}
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "12px", letterSpacing: "0.5px" }}>
        TODAY'S WORKFORCE ATTENDANCE
      </h3>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Active Employees</div>
          <div className="metric-value">{wf.totalActiveEmployees || 0}</div>
          <div className="metric-sub">Total registered workforce</div>
        </div>
        <div className="metric-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div className="metric-label">Present Today</div>
          <div className="metric-value" style={{ color: "var(--success)" }}>{att.presentToday || 0}</div>
          <div className="metric-sub">1.0 Day eligible</div>
        </div>
        <div className="metric-card" style={{ borderLeft: "4px solid var(--warning)" }}>
          <div className="metric-label">Half Day Today</div>
          <div className="metric-value" style={{ color: "var(--warning)" }}>{att.halfDayToday || 0}</div>
          <div className="metric-sub">0.5 Day eligible</div>
        </div>
        <div className="metric-card" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="metric-label">Absent / Leave</div>
          <div className="metric-value" style={{ color: "var(--danger)" }}>{(att.absentToday || 0) + (att.leaveToday || 0)}</div>
          <div className="metric-sub">{att.absentToday || 0} Absent, {att.leaveToday || 0} Leave</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Unmarked Today</div>
          <div className="metric-value">{att.unmarkedToday || 0}</div>
          <div className="metric-sub">
            <Link to="/attendance">Mark attendance &rarr;</Link>
          </div>
        </div>
      </div>

      {/* Monthly Financials (Admin only) */}
      {isAdmin && (
        <>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "12px", letterSpacing: "0.5px" }}>
            MONTHLY PAYROLL & ADVANCES ({fin.currentMonth || "Current"})
          </h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Gross Payroll</div>
              <div className="metric-value">₹{(fin.grossPayroll || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              <div className="metric-sub">Attendance-based wages</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Advances Deducted</div>
              <div className="metric-value">₹{(fin.advances || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              <div className="metric-sub">Prior wage disbursements</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Net Payable</div>
              <div className="metric-value">₹{(fin.netPayroll || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              <div className="metric-sub">After all deductions</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Disbursed Wages</div>
              <div className="metric-value" style={{ color: "var(--success)" }}>
                ₹{(fin.totalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="metric-sub">Recorded payments</div>
            </div>
            <div className="metric-card" style={{ borderLeft: "4px solid var(--primary)" }}>
              <div className="metric-label">Outstanding Payable</div>
              <div className="metric-value" style={{ color: "var(--primary)" }}>
                ₹{(fin.outstandingWages || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="metric-sub">
                <Link to="/payments">Process payments &rarr;</Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Operations & Inventory Overview */}
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "12px", letterSpacing: "0.5px" }}>
        INVENTORY & OPERATIONAL ACTIONS
      </h3>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Pending Item Requests</div>
          <div className="metric-value">{ops.pendingItemRequests || 0}</div>
          <div className="metric-sub">
            <Link to="/item-requests">View requests &rarr;</Link>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pending Reimbursements</div>
          <div className="metric-value">{ops.pendingReimbursements || 0}</div>
          <div className="metric-sub">
            <Link to="/reimbursements">Review claims &rarr;</Link>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Unreceived Lots</div>
          <div className="metric-value">{ops.unreceivedLots || 0}</div>
          <div className="metric-sub">
            <Link to="/purchases">Receive stock &rarr;</Link>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Fuel Expense (Month)</div>
          <div className="metric-value">₹{(ops.fuelSpentMonth || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="metric-sub">
            <Link to="/fuel">Fuel history &rarr;</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
=======
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Alert from '../components/Alert';
import { formatDate, formatMoney, formatQty } from '../utils/format';

const Stat = ({ label, value, note, attention }) => (
  <div className={`stat${attention ? ' attention' : ''}`}>
    <div className="label">{label}</div>
    <div className="value">{value}</div>
    {note && <div className="note">{note}</div>}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/dashboard/summary');

  if (loading && !data) return <div className="page-loading">Loading...</div>;
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!data) return null;

  if (data.role === 'staff') {
    return (
      <>
        <PageHeader title="Dashboard" subtitle={user.name} />
        <div className="stats">
          <Stat label="Open item requests" value={data.openItemRequests} />
          <Stat label="Reimbursements in progress" value={data.openReimbursements} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="stats">
        <Stat label="Stock items tracked" value={data.stockItemCount} />
        <Stat label="Low stock items" value={data.lowStockCount} attention={data.lowStockCount > 0} />
        <Stat label="Item requests pending" value={data.pendingItemRequests} />
        <Stat label="Reimbursements pending" value={data.pendingReimbursements} />
        <Stat label="Owed to vendors" value={formatMoney(data.outstandingToVendors)} />
        <Stat label="Fuel this month" value={formatMoney(data.fuelThisMonth.amount)} note={`${formatQty(data.fuelThisMonth.litres)} litres`} />
      </div>

      <div className="grid-2">
        <section>
          <h2 style={{ marginBottom: 8 }}>Low stock</h2>
          <DataTable
            rows={data.lowStock}
            loading={false}
            emptyMessage="No items are below their reorder level."
            columns={[
              { key: 'name', header: 'Item' },
              { key: 'balance', header: 'In stock', align: 'num', render: (r) => `${formatQty(r.balance)} ${r.unit || ''}` },
              { key: 'reorderLevel', header: 'Reorder level', align: 'num', render: (r) => formatQty(r.reorderLevel) },
            ]}
          />
        </section>
        <section>
          <h2 style={{ marginBottom: 8 }}>Recent stock movements</h2>
          <DataTable
            rows={data.recentMovements}
            loading={false}
            emptyMessage="No stock movements recorded yet."
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'item', header: 'Item', render: (r) => r.itemType?.name || '-' },
              { key: 'type', header: 'Type', render: (r) => (r.type === 'in' ? 'Stock in' : 'Stock out') },
              { key: 'quantity', header: 'Quantity', align: 'num', render: (r) => formatQty(r.quantity) },
            ]}
          />
        </section>
      </div>
    </>
  );
}
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
