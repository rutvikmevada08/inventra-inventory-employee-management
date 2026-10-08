import React, { useEffect, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const Advances = () => {
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonthStr);
  const [employeeFilter, setEmployeeFilter] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    reason: "",
    payrollMonth: currentMonthStr,
  });

  const { isAdmin } = useAuth();

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (month) params.month = month;
      if (employeeFilter) params.employeeId = employeeFilter;

      const [advRes, empRes] = await Promise.all([
        API.get("/advances", { params }),
        API.get("/employees?status=active"),
      ]);

      setAdvances(advRes.data.advances || []);
      setEmployees(empRes.data.employees || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch advances.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
  }, [month, employeeFilter]);

  const handleOpenAdd = () => {
    setFormData({
      employeeId: employees.length > 0 ? employees[0]._id : "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      reason: "",
      payrollMonth: month || currentMonthStr,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.amount) return;

    try {
      setError("");
      await API.post("/advances", formData);
      setSuccess("Advance payment recorded in ledger.");
      setIsModalOpen(false);
      fetchAdvances();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record advance.");
    }
  };

  const totalAmount = advances.reduce(
    (sum, a) => sum + (a.status !== "Cancelled" ? a.amount : 0),
    0
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Advance Payments</h1>
          <p className="page-desc">
            Append-only record of wage advances. Automatically aggregated and deducted during monthly payroll.
          </p>
        </div>

        {isAdmin && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              + Disburse Advance
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
        <label className="form-label" style={{ margin: 0 }}>Target Month:</label>
        <input
          type="month"
          className="form-control"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ width: "170px" }}
        />

        <select
          className="form-select"
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          style={{ width: "200px" }}
        >
          <option value="">All Employees</option>
          {employees.map((emp) => (
            <option key={emp._id} value={emp._id}>
              {emp.name} ({emp.employeeId || "No ID"})
            </option>
          ))}
        </select>

        <div style={{ marginLeft: "auto", fontSize: "13px" }}>
          Total Advances in Period: <strong style={{ color: "var(--primary)" }}>₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading advance records..." />
      ) : advances.length === 0 ? (
        <EmptyState
          title="No advances recorded"
          message={`No advance payments found for ${month}.`}
          action={
            isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                Disburse Advance
              </button>
            )
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Employee</th>
                <th>Disbursement Date</th>
                <th>Target Payroll</th>
                <th>Amount (₹)</th>
                <th>Reason / Purpose</th>
                <th>Deduction Status</th>
                <th>Disbursed By</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((a) => (
                <tr key={a._id}>
                  <td><strong>{a.reference || "-"}</strong></td>
                  <td>
                    <Link to={`/employees/${a.employee?._id}`} style={{ fontWeight: 600 }}>
                      {a.employee?.name}
                    </Link>
                  </td>
                  <td>{new Date(a.date).toLocaleDateString()}</td>
                  <td>{a.payrollMonth || "-"}</td>
                  <td style={{ fontWeight: 700, fontSize: "14px" }}>
                    ₹{(a.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td>{a.reason || "-"}</td>
                  <td>
                    <span
                      className={`badge ${
                        a.status === "Deducted"
                          ? "badge-neutral"
                          : a.status === "Pending"
                          ? "badge-warning"
                          : "badge-danger"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td>{a.createdBy ? a.createdBy.name : "-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "var(--bg-card-alt)", fontWeight: 700 }}>
                <td colSpan="4">TOTAL ADVANCES</td>
                <td style={{ color: "var(--primary)", fontSize: "15px" }}>
                  ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td colSpan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Disburse Advance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Disburse Advance to Employee"
        maxWidth="500px"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Employee *</label>
            <select
              className="form-select"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              required
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.employeeId || "No ID"}) - Rate: ₹{emp.dailyWage}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Advance Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="form-control"
                placeholder="Amount in Rupees"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Disbursement Date *</label>
              <input
                type="date"
                className="form-control"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Deduct in Payroll Month</label>
            <input
              type="month"
              className="form-control"
              value={formData.payrollMonth}
              onChange={(e) => setFormData({ ...formData, payrollMonth: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Justification</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="e.g. Festival advance, Medical aid, Tool purchase"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
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
