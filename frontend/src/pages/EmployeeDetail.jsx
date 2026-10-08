import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api";
import { LoadingSpinner, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const EmployeeDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Quick Action: Add Advance Modal
  const [advanceModal, setAdvanceModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceReason, setAdvanceReason] = useState("");

  const { isAdmin } = useAuth();

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/employees/${id}/financial-summary`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load employee details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [id]);

  const handleCreateAdvance = async (e) => {
    e.preventDefault();
    if (!advanceAmount || Number(advanceAmount) <= 0) return;
    try {
      setError("");
      await API.post("/advances", {
        employeeId: id,
        amount: Number(advanceAmount),
        reason: advanceReason,
      });
      setSuccess("Advance disbursement recorded successfully.");
      setAdvanceModal(false);
      setAdvanceAmount("");
      setAdvanceReason("");
      fetchSummary();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record advance.");
    }
  };

  if (loading) return <LoadingSpinner message="Retrieving employee profile and financial ledger..." />;
  if (!data) return <ErrorMessage message="Employee profile not found." />;

  const emp = data.employee || {};
  const att = data.attendanceSummary || {};
  const adv = data.advances || {};
  const fin = data.financialStatus || {};
  const payrolls = data.payrolls || [];
  const payments = data.payments?.records || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ marginBottom: "6px" }}>
            <Link to="/employees" style={{ fontSize: "13px" }}>
              &larr; Back to Workforce Directory
            </Link>
          </div>
          <h1 className="page-title">{emp.name}</h1>
          <p className="page-desc">
            ID: <strong>{emp.employeeId || "-"}</strong> | {emp.department} &bull; {emp.designation} &bull;{" "}
            <span className={`badge ${emp.isActive ? "badge-success" : "badge-danger"}`}>
              {emp.isActive ? "Active" : "Inactive"}
            </span>
          </p>
        </div>

        {isAdmin && (
          <div className="header-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setAdvanceModal(true)}>
              + Disburse Advance
            </button>
            <Link to="/attendance" className="btn btn-secondary btn-sm">
              Record Attendance
            </Link>
            <Link to="/payments" className="btn btn-success btn-sm">
              Record Payment
            </Link>
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

      {/* Executive Financial Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Daily Wage Rate</div>
          <div className="metric-value">₹{(emp.dailyWage || 0).toFixed(2)}</div>
          <div className="metric-sub">{emp.employmentType || "Daily Wage"}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Eligible Days</div>
          <div className="metric-value">{att.totalEligibleDays || 0}</div>
          <div className="metric-sub">
            {att.presentCount || 0} Present, {att.halfDayCount || 0} Half Day
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Advances Taken</div>
          <div className="metric-value">₹{(adv.totalAdvances || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="metric-sub">{adv.records?.length || 0} Advances on record</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Wages Disbursed</div>
          <div className="metric-value" style={{ color: "var(--success)" }}>
            ₹{(fin.totalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">{payments.length} Payments completed</div>
        </div>

        <div className="metric-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="metric-label">Remaining Payable</div>
          <div className="metric-value" style={{ color: "var(--primary)" }}>
            ₹{(fin.outstandingPayable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Net payable balance</div>
        </div>
      </div>

      {/* Profile Details & Recent Attendance */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
        {/* Profile Card */}
        <div className="card">
          <h3 className="card-title">Employee Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Phone:</span>
              <p style={{ fontWeight: 600 }}>{emp.phone || "-"}</p>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Email:</span>
              <p style={{ fontWeight: 600 }}>{emp.email || "-"}</p>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Joining Date:</span>
              <p style={{ fontWeight: 600 }}>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "-"}</p>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Address:</span>
              <p style={{ fontWeight: 600 }}>{emp.address || "-"}</p>
            </div>
            {emp.notes && (
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "var(--text-muted)" }}>Notes:</span>
                <p>{emp.notes}</p>
              </div>
            )}
            {!emp.isActive && (
              <div style={{ gridColumn: "1 / -1", backgroundColor: "var(--danger-light)", padding: "8px", borderRadius: "4px" }}>
                <span style={{ color: "var(--danger)", fontWeight: 700 }}>Deactivation Notice:</span>
                <p style={{ color: "var(--danger)" }}>{emp.deactivationReason || "Deactivated by administrator"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="card">
          <h3 className="card-title">Recent Attendance Records</h3>
          {att.recentAttendances?.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No attendance records logged yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Eligible Days</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {att.recentAttendances.slice(0, 5).map((r) => (
                    <tr key={r._id}>
                      <td>{new Date(r.date).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`badge ${
                            r.status === "Present"
                              ? "badge-success"
                              : r.status === "Half Day"
                              ? "badge-warning"
                              : "badge-danger"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td>{r.eligibleDays}</td>
                      <td>{r.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Payroll History */}
      <div className="card">
        <h3 className="card-title">Monthly Payroll Ledger</h3>
        {payrolls.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No monthly payroll cycles processed for this employee.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Eligible Days</th>
                  <th>Daily Wage</th>
                  <th>Gross Wage</th>
                  <th>Advances Deducted</th>
                  <th>Net Payable</th>
                  <th>Disbursed</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p) => {
                  const rem = Math.max(0, Math.round(((p.netPayable || 0) - (p.paidAmount || 0)) * 100) / 100);
                  return (
                    <tr key={p._id}>
                      <td><strong>{p.month}</strong></td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Advances & Payments Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
        {/* Advance History */}
        <div className="card">
          <h3 className="card-title">Advance Payment History</h3>
          {adv.records?.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No advances taken.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adv.records.map((a) => (
                    <tr key={a._id}>
                      <td>{new Date(a.date).toLocaleDateString()}</td>
                      <td><strong>₹{(a.amount || 0).toFixed(2)}</strong></td>
                      <td>{a.reason || "-"}</td>
                      <td>
                        <span className={`badge ${a.status === "Deducted" ? "badge-neutral" : "badge-warning"}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payments History */}
        <div className="card">
          <h3 className="card-title">Wage Disbursements</h3>
          {payments.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No disbursements recorded yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Payment Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pm) => (
                    <tr key={pm._id}>
                      <td>{new Date(pm.paymentDate).toLocaleDateString()}</td>
                      <td><strong>₹{(pm.amount || 0).toFixed(2)}</strong></td>
                      <td>{pm.paymentMethod}</td>
                      <td>{pm.transactionReference || "-"}</td>
                      <td>
                        <span className={`badge ${pm.status === "Completed" ? "badge-success" : "badge-danger"}`}>
                          {pm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Advance Modal */}
      <Modal isOpen={advanceModal} onClose={() => setAdvanceModal(false)} title={`Disburse Advance to ${emp.name}`}>
        <form onSubmit={handleCreateAdvance}>
          <div className="form-group">
            <label className="form-label">Advance Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="1"
              className="form-control"
              placeholder="e.g. 2000"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Notes</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Medical emergency, Festival advance"
              value={advanceReason}
              onChange={(e) => setAdvanceReason(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setAdvanceModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Record Advance
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
