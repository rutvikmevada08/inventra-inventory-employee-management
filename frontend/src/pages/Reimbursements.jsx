import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const Reimbursements = () => {
  const [reimbursements, setReimbursements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    Amount: "",
    Spent_on: "",
    Vendor: "",
    Invoice_number: "",
    Date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [invoiceFile, setInvoiceFile] = useState(null);

  // Pay Modal
  const [payModal, setPayModal] = useState({ open: false, item: null, paidBy: "Sanjeev Sharma" });

  const { isAdmin } = useAuth();

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [reimbRes, empRes] = await Promise.all([
        API.get("/reimbursements", { params }),
        API.get("/employees?status=active"),
      ]);

      setReimbursements(reimbRes.data.reimbursements || []);
      setSummary(reimbRes.data.summary || {});
      setEmployees(empRes.data.employees || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load reimbursements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReimbursements();
  }, [statusFilter]);

  const handleOpenAdd = () => {
    setFormData({
      employeeId: employees.length > 0 ? employees[0]._id : "",
      Amount: "",
      Spent_on: "",
      Vendor: "",
      Invoice_number: "",
      Date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setInvoiceFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.Amount || !formData.Spent_on) return;

    try {
      setError("");
      const data = new FormData();
      Object.keys(formData).forEach((k) => data.append(k, formData[k]));
      if (invoiceFile) {
        data.append("invoice", invoiceFile);
      }

      await API.post("/reimbursements", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Reimbursement claim submitted.");
      setIsModalOpen(false);
      fetchReimbursements();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit reimbursement.");
    }
  };

  const handleApprove = async (id) => {
    try {
      setError("");
      await API.post(`/reimbursements/${id}/approve`);
      setSuccess("Reimbursement approved.");
      fetchReimbursements();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to approve claim.");
    }
  };

  const handlePayConfirm = async (e) => {
    e.preventDefault();
    if (!payModal.item) return;

    try {
      setError("");
      await API.post(`/reimbursements/${payModal.item._id}/pay`, { paidBy: payModal.paidBy });
      setSuccess("Reimbursement disbursed and locked.");
      setPayModal({ open: false, item: null, paidBy: "Sanjeev Sharma" });
      fetchReimbursements();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to disburse reimbursement.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expense Reimbursements</h1>
          <p className="page-desc">
            4-Stage lifecycle: Requested &rarr; Approved &rarr; Paid &rarr; Locked. Immutable once disbursed.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + Submit Expense Claim
          </button>
        </div>
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
          <div className="metric-label">Total Claims Count</div>
          <div className="metric-value">{summary.totalCount || 0}</div>
          <div className="metric-sub">Submitted expense receipts</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pending Approval</div>
          <div className="metric-value" style={{ color: "var(--warning)" }}>
            ₹{(summary.pendingAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Awaiting disbursement</div>
        </div>
        <div className="metric-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div className="metric-label">Settled & Locked</div>
          <div className="metric-value" style={{ color: "var(--success)" }}>
            ₹{(summary.paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Disbursed to workforce</div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: "200px" }}
        >
          <option value="">All Workflow Stages</option>
          <option value="Requested">Requested (Initial)</option>
          <option value="Approved">Approved (Ready to Pay)</option>
          <option value="Paid">Paid / Reimbursed (Locked)</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading reimbursement claims..." />
      ) : reimbursements.length === 0 ? (
        <EmptyState
          title="No reimbursement claims found"
          message="Submit an expense receipt to request reimbursement for project materials or travel."
          action={
            <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              Submit Expense Claim
            </button>
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Purpose / Spent On</th>
                <th>Vendor</th>
                <th>Amount (₹)</th>
                <th>Receipt / Invoice</th>
                <th>Status</th>
                <th>Disbursed By</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {reimbursements.map((r) => {
                const isLocked = ["Paid", "Reimbursed"].includes(r.Status);
                return (
                  <tr key={r._id}>
                    <td>{new Date(r.Date).toLocaleDateString()}</td>
                    <td>
                      <strong>{r.employee?.name}</strong>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {r.employee?.department}
                      </div>
                    </td>
                    <td>{r.Spent_on}</td>
                    <td>{r.Vendor || "-"}</td>
                    <td style={{ fontWeight: 700, fontSize: "14px", color: isLocked ? "var(--success)" : "var(--primary)" }}>
                      ₹{(r.Amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      {r.Invoice ? (
                        <a href={r.Invoice.startsWith("/") ? r.Invoice : `/${r.Invoice}`} target="_blank" rel="noopener noreferrer">
                          {r.Invoice_number ? `#${r.Invoice_number}` : "View Slip"}
                        </a>
                      ) : (
                        r.Invoice_number || "-"
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          isLocked
                            ? "badge-success"
                            : r.Status === "Approved"
                            ? "badge-info"
                            : r.Status === "Requested"
                            ? "badge-warning"
                            : "badge-danger"
                        }`}
                      >
                        {isLocked ? "Paid & Locked" : r.Status}
                      </span>
                    </td>
                    <td>{r.Paid_by || "-"}</td>
                    {isAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {r.Status === "Requested" && (
                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(r._id)}>
                              Approve
                            </button>
                          )}
                          {!isLocked && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setPayModal({ open: true, item: r, paidBy: "Sanjeev Sharma" })}
                            >
                              Disburse
                            </button>
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

      {/* Submit Claim Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit Expense Reimbursement Claim" maxWidth="600px">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Employee *</label>
              <select
                className="form-select"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                required
              >
                <option value="">Select workforce member...</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Claim Date *</label>
              <input
                type="date"
                className="form-control"
                value={formData.Date}
                onChange={(e) => setFormData({ ...formData, Date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="form-control"
                placeholder="Disbursement Amount"
                value={formData.Amount}
                onChange={(e) => setFormData({ ...formData, Amount: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vendor / Merchant</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Local Hardware, Taxi Service"
                value={formData.Vendor}
                onChange={(e) => setFormData({ ...formData, Vendor: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Purpose / Spent On *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Emergency electrical wires, testing cable, auto fare"
              value={formData.Spent_on}
              onChange={(e) => setFormData({ ...formData, Spent_on: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Invoice / Receipt No.</label>
              <input
                type="text"
                className="form-control"
                placeholder="Receipt slip number"
                value={formData.Invoice_number}
                onChange={(e) => setFormData({ ...formData, Invoice_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Attach Receipt Slip</label>
              <input
                type="file"
                className="form-control"
                accept=".jpg,.jpeg,.png,.pdf,.webp"
                onChange={(e) => setInvoiceFile(e.target.files[0] || null)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Claim
            </button>
          </div>
        </form>
      </Modal>

      {/* Disburse Modal */}
      <Modal
        isOpen={payModal.open}
        onClose={() => setPayModal({ open: false, item: null, paidBy: "Sanjeev Sharma" })}
        title={`Disburse Reimbursement to ${payModal.item?.employee?.name}`}
        maxWidth="460px"
      >
        <form onSubmit={handlePayConfirm}>
          <p style={{ marginBottom: "14px", fontSize: "13px" }}>
            Disbursing <strong>₹{payModal.item?.Amount?.toFixed(2)}</strong> for purpose:{" "}
            <em>"{payModal.item?.Spent_on}"</em>. This action will lock the claim from future modification.
          </p>

          <div className="form-group">
            <label className="form-label">Paid By (Disbursing Officer) *</label>
            <input
              type="text"
              className="form-control"
              value={payModal.paidBy}
              onChange={(e) => setPayModal({ ...payModal, paidBy: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPayModal({ open: false, item: null, paidBy: "Sanjeev Sharma" })}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-success">
              Confirm & Lock
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
