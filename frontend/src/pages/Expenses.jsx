import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "Office Maintenance",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    vendorId: "",
    personName: "",
    reference: "",
    status: "Paid",
    notes: "",
  });

  const { isAdmin } = useAuth();

  const categories = [
    "Office Maintenance",
    "Electricity Bill",
    "Internet & Broadband",
    "Software Subscription",
    "Courier & Logistics",
    "Office Rent",
    "Vehicle Servicing",
    "Legal & Compliance",
    "Tools & Hardware",
    "Groceries & Refreshments",
    "General Operations",
  ];

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (categoryFilter) params.category = categoryFilter;

      const [expRes, venRes] = await Promise.all([
        API.get("/expenses", { params }),
        API.get("/vendors?status=active"),
      ]);

      setExpenses(expRes.data.expenses || []);
      setTotalAmount(expRes.data.totalAmount || 0);
      setVendors(venRes.data.vendors || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter]);

  const handleOpenAdd = () => {
    setFormData({
      category: "Office Maintenance",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      vendorId: "",
      personName: "",
      reference: "",
      status: "Paid",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.amount || !formData.description) return;

    try {
      setError("");
      await API.post("/expenses", formData);
      setSuccess("Expense recorded successfully.");
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record expense.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Company Operating Expenses</h1>
          <p className="page-desc">Track general business expenses, utility bills, office maintenance, and software subscriptions.</p>
        </div>

        {isAdmin && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              + Record Expense
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

      {/* Filter toolbar */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: "220px" }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div style={{ marginLeft: "auto", fontSize: "13px" }}>
          Total Expenditure: <strong style={{ color: "var(--primary)" }}>₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading operational expenses..." />
      ) : expenses.length === 0 ? (
        <EmptyState
          title="No expenses recorded"
          message="Record business expenses to track overheads and operational costs."
          action={
            isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                Record Expense
              </button>
            )
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount (₹)</th>
                <th>Vendor / Payee</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id}>
                  <td>{new Date(e.date).toLocaleDateString()}</td>
                  <td>
                    <span className="badge badge-neutral">{e.category}</span>
                  </td>
                  <td><strong>{e.description}</strong></td>
                  <td style={{ fontWeight: 700, fontSize: "14px", color: "var(--primary)" }}>
                    ₹{(e.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td>{e.vendor ? e.vendor.Business_name : e.personName || "-"}</td>
                  <td>{e.reference || "-"}</td>
                  <td>
                    <span className={`badge ${e.status === "Paid" ? "badge-success" : "badge-warning"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td>{e.createdBy ? e.createdBy.name : "-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "var(--bg-card-alt)", fontWeight: 700 }}>
                <td colSpan="3">TOTAL EXPENDITURE</td>
                <td style={{ color: "var(--primary)", fontSize: "15px" }}>
                  ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td colSpan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Record Expense Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Business Expense" maxWidth="560px">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-control"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                min="0.01"
                className="form-control"
                placeholder="Amount in Rupees"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payee / Person</label>
              <input
                type="text"
                className="form-control"
                placeholder="Person receiving payment"
                value={formData.personName}
                onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Monthly electricity bill for warehouse unit 2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Associated Vendor (Optional)</label>
              <select
                className="form-select"
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              >
                <option value="">None / Direct</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>{v.Business_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reference / Bill No.</label>
              <input
                type="text"
                className="form-control"
                placeholder="Transaction ID / receipt"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Record Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
