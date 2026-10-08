import React, { useEffect, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { useAuth } from "../context/AuthContext";

export const Payroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState("");

  const { isAdmin } = useAuth();

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { month };
      if (statusFilter) params.status = statusFilter;
      const res = await API.get("/payroll", { params });
      setPayrolls(res.data.payrolls || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch payroll records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [month, statusFilter]);

  const handleGeneratePayroll = async () => {
    if (!isAdmin) return;
    try {
      setGenerating(true);
      setError("");
      setSuccess("");
      const res = await API.post("/payroll/generate", { month });
      setSuccess(`Payroll generated: ${res.data.generatedCount} records calculated/updated.`);
      fetchPayrolls();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate payroll.");
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalize = async (id, empName) => {
    if (!isAdmin) return;
    if (!window.confirm(`Finalize and lock payroll for ${empName}? This will lock attendance calculations and deduct pending advances.`)) {
      return;
    }
    try {
      await API.post(`/payroll/${id}/finalize`);
      setSuccess(`Payroll for ${empName} finalized and locked.`);
      fetchPayrolls();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to finalize payroll.");
    }
  };

  const handleUnfinalize = async (id, empName) => {
    if (!isAdmin) return;
    if (!window.confirm(`Unlock payroll for ${empName} back to Draft for corrections?`)) {
      return;
    }
    try {
      await API.post(`/payroll/${id}/unfinalize`);
      setSuccess(`Payroll for ${empName} unlocked back to Draft.`);
      fetchPayrolls();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to unlock payroll.");
    }
  };

  const totalGross = payrolls.reduce((sum, p) => sum + (p.grossAmount || 0), 0);
  const totalAdvances = payrolls.reduce((sum, p) => sum + (p.advances || 0), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + (p.netPayable || 0), 0);
  const totalPaid = payrolls.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalOutstanding = Math.max(0, Math.round((totalNet - totalPaid) * 100) / 100);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Payroll Ledger</h1>
          <p className="page-desc">
            Calculate gross attendance wages, deduct advances, lock finalized payrolls, and track disbursements.
          </p>
        </div>

        {isAdmin && (
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={handleGeneratePayroll}
              disabled={generating}
            >
              {generating ? "Computing Wages..." : `Generate / Refresh Payroll (${month})`}
            </button>
          </div>
        )}
      </div>

      <ErrorMessage message={error} onDismiss={() => setError("")} />
      {success && (
        <div className="alert alert-success">
          <span>{success}</span>
          <button className="alert-close" onClick={() => setSuccess("")}>&times;</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Gross Wages</div>
          <div className="metric-value">₹{totalGross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="metric-sub">Attendance wage sum</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Advances Deducted</div>
          <div className="metric-value">₹{totalAdvances.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="metric-sub">Subtracted from gross</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Net Payable</div>
          <div className="metric-value">₹{totalNet.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="metric-sub">Total payable amount</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Disbursed</div>
          <div className="metric-value" style={{ color: "var(--success)" }}>
            ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Recorded payments</div>
        </div>
        <div className="metric-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="metric-label">Outstanding Balance</div>
          <div className="metric-value" style={{ color: "var(--primary)" }}>
            ₹{totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Unpaid wages</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="filter-bar">
        <label className="form-label" style={{ margin: 0 }}>Payroll Month:</label>
        <input
          type="month"
          className="form-control"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ width: "170px" }}
        />

        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: "160px" }}
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft Only</option>
          <option value="Finalized">Finalized</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Paid">Fully Paid</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner message={`Compiling payroll for ${month}...`} />
      ) : payrolls.length === 0 ? (
        <EmptyState
          title="No payroll generated yet"
          message={`No payroll records exist for ${month}. Click 'Generate / Refresh Payroll' to calculate wages for all active workforce members.`}
          action={
            isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={handleGeneratePayroll} disabled={generating}>
                Generate {month} Payroll
              </button>
            )
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Eligible Days</th>
                <th>Daily Rate</th>
                <th>Gross (₹)</th>
                <th>Advances (₹)</th>
                <th>Net Payable (₹)</th>
                <th>Paid (₹)</th>
                <th>Remaining (₹)</th>
                <th>Status</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {payrolls.map((p) => {
                const rem = Math.max(0, Math.round(((p.netPayable || 0) - (p.paidAmount || 0)) * 100) / 100);
                return (
                  <tr key={p._id}>
                    <td><strong>{p.employee?.employeeId || "-"}</strong></td>
                    <td>
                      <Link to={`/employees/${p.employee?._id}`} style={{ fontWeight: 600 }}>
                        {p.employee?.name}
                      </Link>
                    </td>
                    <td>{p.totalEligibleDays}</td>
                    <td>₹{(p.dailyWage || 0).toFixed(2)}</td>
                    <td>₹{(p.grossAmount || 0).toFixed(2)}</td>
                    <td>₹{(p.advances || 0).toFixed(2)}</td>
                    <td><strong>₹{(p.netPayable || 0).toFixed(2)}</strong></td>
                    <td style={{ color: "var(--success)" }}>₹{(p.paidAmount || 0).toFixed(2)}</td>
                    <td style={{ color: "var(--primary)", fontWeight: 700 }}>₹{rem.toFixed(2)}</td>
                    <td>
                      <span
                        className={`badge ${
                          p.status === "Paid"
                            ? "badge-success"
                            : p.status === "Finalized"
                            ? "badge-info"
                            : p.status === "Partially Paid"
                            ? "badge-warning"
                            : "badge-neutral"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {p.status === "Draft" ? (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleFinalize(p._id, p.employee?.name)}
                            >
                              Finalize & Lock
                            </button>
                          ) : (
                            p.paidAmount === 0 && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleUnfinalize(p._id, p.employee?.name)}
                                title="Unlock back to draft for adjustments"
                              >
                                Unlock
                              </button>
                            )
                          )}
                          {p.status !== "Draft" && rem > 0 && (
                            <Link to={`/payments?payrollId=${p._id}`} className="btn btn-primary btn-sm">
                              Pay
                            </Link>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
