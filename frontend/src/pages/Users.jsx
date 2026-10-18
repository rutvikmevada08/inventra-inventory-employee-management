import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    phone: "",
  });

  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/auth/users");
      setUsers(res.data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "staff",
      phone: "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;

    try {
      setError("");
      await API.post("/auth/users", formData);
      setSuccess("User account created successfully.");
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create user.");
    }
  };

  const handleToggleActive = async (targetUser) => {
    if (targetUser._id === currentUser.id) {
      setError("You cannot deactivate your own account.");
      return;
    }
    try {
      setError("");
      await API.patch(`/auth/users/${targetUser._id}/toggle`);
      setSuccess(`User ${targetUser.name} status updated.`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update user status.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">System User Accounts</h1>
          <p className="page-desc">
            Manage authenticated logins. Note: These are login credentials (Admin or Staff), distinct from workforce labour records.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + Add System User
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

      {loading ? (
        <LoadingSpinner message="Loading user accounts..." />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" message="No user accounts registered." />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email Address</th>
                <th>System Role</th>
                <th>Phone</th>
                <th>Account Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`user-role-badge badge-${u.role}`}>{u.role.toUpperCase()}</span>
                  </td>
                  <td>{u.phone || "-"}</td>
                  <td>
                    <span className={`badge ${u.isActive ? "badge-success" : "badge-danger"}`}>
                      {u.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {u._id !== currentUser?.id && (
                      <button
                        className={`btn btn-sm ${u.isActive ? "btn-outline-danger" : "btn-success"}`}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create System Login Account" maxWidth="500px">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Login Email *</label>
            <input
              type="email"
              className="form-control"
              placeholder="user@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              className="form-control"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="staff">Staff (Restricted to Requests, Reimbursements, Fuel)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-control"
                placeholder="Mobile number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
