import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const ItemRequests = () => {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    itemTypeId: "",
    quantity: "1",
    reason: "",
    date: new Date().toISOString().split("T")[0],
  });

  const { isAdmin } = useAuth();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [reqRes, empRes, typesRes] = await Promise.all([
        API.get("/item-requests", { params }),
        API.get("/employees?status=active"),
        API.get("/inventory/item-types"),
      ]);

      setRequests(reqRes.data.requests || []);
      setEmployees(empRes.data.employees || []);
      setItemTypes(typesRes.data.itemTypes || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load item requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleOpenAdd = () => {
    setFormData({
      employeeId: employees.length > 0 ? employees[0]._id : "",
      itemTypeId: itemTypes.length > 0 ? itemTypes[0]._id : "",
      quantity: "1",
      reason: "",
      date: new Date().toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.itemTypeId || !formData.quantity || !formData.reason) {
      return;
    }
    try {
      setError("");
      await API.post("/item-requests", formData);
      setSuccess("Item request submitted successfully.");
      setIsModalOpen(false);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit item request.");
    }
  };

  const handleApprove = async (id) => {
    try {
      setError("");
      await API.post(`/item-requests/${id}/approve`);
      setSuccess("Item request approved.");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to approve request.");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Are you sure you want to reject this item request?")) return;
    try {
      setError("");
      await API.post(`/item-requests/${id}/reject`);
      setSuccess("Item request rejected.");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reject request.");
    }
  };

  const handleIssueStock = async (id, itemName, qty) => {
    if (!window.confirm(`Issue ${qty} units of ${itemName} from inventory stock to employee? This records a STOCK_OUT entry in the stock ledger.`)) {
      return;
    }
    try {
      setError("");
      await API.post(`/item-requests/${id}/issue`);
      setSuccess(`Issued ${qty} units of ${itemName} to workforce member and recorded in stock ledger.`);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to issue stock.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workforce Item Requests</h1>
          <p className="page-desc">
            Submit material requests, approve requisitions, and issue inventory items with automatic stock ledger updates.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + Request Materials
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

      {/* Filter toolbar */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: "180px" }}
        >
          <option value="">All Statuses</option>
          <option value="Requested">Requested (Pending)</option>
          <option value="Approved">Approved (Ready to Issue)</option>
          <option value="Issued">Issued (Stock Out)</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading material requests..." />
      ) : requests.length === 0 ? (
        <EmptyState
          title="No item requests found"
          message="Submit a new requisition for tools, hardware, or office supplies."
          action={
            <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              Request Materials
            </button>
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Request Date</th>
                <th>Employee</th>
                <th>Item Requested</th>
                <th>Quantity</th>
                <th>Purpose / Reason</th>
                <th>Status</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td>{new Date(r.Date).toLocaleDateString()}</td>
                  <td>
                    <strong>{r.Employee ? r.Employee.name : "-"}</strong>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {r.Employee?.department}
                    </div>
                  </td>
                  <td>
                    <strong>{r.item ? r.item.Type_name : "-"}</strong>
                  </td>
                  <td>
                    <strong>{r.Quantity} {r.item?.unit || "pcs"}</strong>
                  </td>
                  <td>{r.reason}</td>
                  <td>
                    <span
                      className={`badge ${
                        r.Status === "Issued"
                          ? "badge-success"
                          : r.Status === "Approved"
                          ? "badge-info"
                          : r.Status === "Requested"
                          ? "badge-warning"
                          : "badge-danger"
                      }`}
                    >
                      {r.Status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        {r.Status === "Requested" && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleApprove(r._id)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleReject(r._id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(r.Status === "Approved" || r.Status === "Requested") && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleIssueStock(r._id, r.item?.Type_name, r.Quantity)}
                            title="Issue stock from inventory and write to ledger"
                          >
                            Issue Stock
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Item Request Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit Material Requisition" maxWidth="500px">
        <form onSubmit={handleSubmitRequest}>
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
                  {emp.name} ({emp.department} - {emp.designation})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Item Type *</label>
              <select
                className="form-select"
                value={formData.itemTypeId}
                onChange={(e) => setFormData({ ...formData, itemTypeId: e.target.value })}
                required
              >
                <option value="">Choose item type...</option>
                {itemTypes.map((it) => (
                  <option key={it._id} value={it._id}>
                    {it.Type_name} ({it.unit || "pcs"})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Required Date</label>
            <input
              type="date"
              className="form-control"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Purpose / Reason *</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="e.g. Robot assembly, vehicle sensor mounting, field repair"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
