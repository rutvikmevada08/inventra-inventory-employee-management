import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const Payments = () => {
  const [searchParams] = useSearchParams();
  const initialPayrollId = searchParams.get("payrollId") || "";

  const [payments, setPayments] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [payrollFilter, setPayrollFilter] = useState(initialPayrollId);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    payrollId: initialPayrollId,
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Bank Transfer",
    transactionReference: "",
    notes: "",
  });

  // Void Modal
  const [voidModal, setVoidModal] = useState({ open: false, payment: null, reason: "" });

  const { isAdmin } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (payrollFilter) params.payrollId = payrollFilter;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const [payRes, payrollRes] = await Promise.all([
        API.get("/payments", { params }),
        API.get("/payroll?status=Finalized,Partially Paid"),
      ]);

      setPayments(payRes.data.payments || []);
      setPayrolls(payrollRes.data.payrolls || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch payment records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [payrollFilter, startDate, endDate]);

  const handleOpenAdd = () => {
    const selectedPayroll = payrolls.find((p) => p._id === formData.payrollId) || payrolls[0];
    const rem = selectedPayroll ? Math.max(0, (selectedPayroll.netPayable || 0) - (selectedPayroll.paidAmount || 0)) : 0;

    setFormData({
      payrollId: selectedPayroll ? selectedPayroll._id : "",
      amount: rem > 0 ? String(rem) : "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "Bank Transfer",
      transactionReference: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handlePayrollChange = (pId) => {
    const p = payrolls.find((item) => item._id === pId);
    const rem = p ? Math.max(0, (p.netPayable || 0) - (p.paidAmount || 0)) : 0;
    setFormData({
      ...formData,
      payrollId: pId,
      amount: rem > 0 ? String(rem) : "",
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.payrollId || !formData.amount) return;

    try {
      setError("");
      await API.post("/payments", formData);
      setSuccess("Wage payment recorded successfully.");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record payment.");
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidModal.payment) return;
    try {
      setError("");
      await API.post(`/payments/${voidModal.payment._id}/void`, { reason: voidModal.reason });
      setSuccess("Payment voided and reversed on employee payroll ledger.");
      setVoidModal({ open: false, payment: null, reason: "" });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to void payment.");
    }
  };

  const totalPaid = payments.reduce(
    (sum, p) => sum + (p.status === "Completed" ? p.amount : 0),
    0
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Wage Disbursements</h1>
          <p className="page-desc">
            Append-only payment register. Supports partial disbursements with strict overpayment protection.
          </p>
        </div>

        {isAdmin && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              + Record Payment
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

      {/* Filter Toolbar */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={payrollFilter}
          onChange={(e) => setPayrollFilter(e.target.value)}
          style={{ width: "240px" }}
        >
          <option value="">All Payroll Reference Cycles</option>
          {payrolls.map((p) => (
            <option key={p._id} value={p._id}>
              {p.employee?.name} - {p.month} (Rem: ₹{((p.netPayable || 0) - (p.paidAmount || 0)).toFixed(2)})
            </option>
          ))}
        </select>

        <div style={{ marginLeft: "auto", fontSize: "13px" }}>
          Total Disbursed: <strong style={{ color: "var(--success)" }}>₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading disbursement ledger..." />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payment records found"
          message="No wage disbursements recorded for the current filter criteria."
          action={
            isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                Record Payment
              </button>
            )
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Payment Date</th>
                <th>Employee</th>
                <th>Payroll Period</th>
                <th>Amount (₹)</th>
                <th>Payment Method</th>
                <th>Reference / UTR</th>
                <th>Status</th>
                <th>Recorded By</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/employees/${p.employee?._id}`} style={{ fontWeight: 600 }}>
                      {p.employee?.name}
                    </Link>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{p.payroll?.month || "-"}</span>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: "14px", color: p.status === "Completed" ? "var(--success)" : "var(--text-light)" }}>
                    ₹{(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td>{p.paymentMethod}</td>
                  <td>{p.transactionReference || "-"}</td>
                  <td>
                    <span className={`badge ${p.status === "Completed" ? "badge-success" : "badge-danger"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>{p.createdBy ? p.createdBy.name : "-"}</td>
                  {isAdmin && (
                    <td style={{ textAlign: "right" }}>
                      {p.status === "Completed" && (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => setVoidModal({ open: true, payment: p, reason: "" })}
                        >
                          Void
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "var(--bg-card-alt)", fontWeight: 700 }}>
                <td colSpan="3">TOTAL VALID PAYMENTS</td>
                <td style={{ color: "var(--success)", fontSize: "15px" }}>
                  ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td colSpan="5"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Employee Wage Payment"
        maxWidth="540px"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Select Finalized Payroll *</label>
            <select
              className="form-select"
              value={formData.payrollId}
              onChange={(e) => handlePayrollChange(e.target.value)}
              required
            >
              <option value="">Choose employee payroll cycle...</option>
              {payrolls.map((p) => {
                const rem = Math.max(0, (p.netPayable || 0) - (p.paidAmount || 0));
                return (
                  <option key={p._id} value={p._id}>
                    {p.employee?.name} &bull; {p.month} &bull; Net: ₹{p.netPayable} (Remaining: ₹{rem.toFixed(2)})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Payment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                placeholder="Disbursement Amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input
                type="date"
                className="form-control"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-select"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              >
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Transaction Reference / UTR</label>
              <input
                type="text"
                className="form-control"
                placeholder="Bank ref or cheque number"
                value={formData.transactionReference}
                onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Salary settlement part 1"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Confirm Disbursement
            </button>
          </div>
        </form>
      </Modal>

      {/* Void Confirmation Modal */}
      <Modal
        isOpen={voidModal.open}
        onClose={() => setVoidModal({ open: false, payment: null, reason: "" })}
        title="Void Wage Payment"
        maxWidth="460px"
      >
        <p style={{ marginBottom: "12px", color: "var(--text-main)" }}>
          Are you sure you want to void payment of{" "}
          <strong>₹{voidModal.payment?.amount?.toFixed(2)}</strong> for{" "}
          <strong>{voidModal.payment?.employee?.name}</strong>?
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
          Notice: This will reverse the payment on the payroll ledger and re-open the payable balance. The payment record remains preserved for auditing with status 'Voided'.
        </p>

        <div className="form-group">
          <label className="form-label">Reason for Void</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Transaction failed, duplicate entry"
            value={voidModal.reason}
            onChange={(e) => setVoidModal({ ...voidModal, reason: e.target.value })}
            required
          />
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setVoidModal({ open: false, payment: null, reason: "" })}
          >
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirmVoid}>
            Confirm Void
          </button>
        </div>
      </Modal>
    </div>
  );
};
