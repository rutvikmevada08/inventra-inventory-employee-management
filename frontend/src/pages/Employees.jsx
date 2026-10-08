import React, { useEffect, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [deptFilter, setDeptFilter] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    department: "Operations",
    designation: "Worker",
    employmentType: "Daily Wage",
    dailyWage: 500,
    monthlySalary: 0,
    notes: "",
  });

  // Deactivate modal
  const [deactivateModal, setDeactivateModal] = useState({ open: false, employee: null, reason: "" });

  const { isAdmin } = useAuth();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (deptFilter) params.department = deptFilter;

      const res = await API.get("/employees", { params });
      setEmployees(res.data.employees || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [statusFilter, deptFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEmployees();
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData({
      employeeId: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      department: "Operations",
      designation: "Worker",
      employmentType: "Daily Wage",
      dailyWage: 500,
      monthlySalary: 0,
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      employeeId: emp.employeeId || "",
      name: emp.name || emp.Name || "",
      email: emp.email || emp.Email || "",
      phone: emp.phone || (emp.Number ? String(emp.Number) : ""),
      address: emp.address || "",
      department: emp.department || "Operations",
      designation: emp.designation || "Worker",
      employmentType: emp.employmentType || "Daily Wage",
      dailyWage: emp.dailyWage || 0,
      monthlySalary: emp.monthlySalary || 0,
      notes: emp.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      if (editingEmployee) {
        await API.put(`/employees/${editingEmployee._id}`, formData);
        setSuccess("Employee updated successfully.");
      } else {
        await API.post("/employees", formData);
        setSuccess("Employee registered successfully.");
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save employee.");
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateModal.employee) return;
    try {
      await API.patch(`/employees/${deactivateModal.employee._id}/deactivate`, {
        reason: deactivateModal.reason,
      });
      setSuccess(`Employee ${deactivateModal.employee.name} deactivated.`);
      setDeactivateModal({ open: false, employee: null, reason: "" });
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to deactivate employee.");
    }
  };

  const handleReactivate = async (emp) => {
    try {
      await API.patch(`/employees/${emp._id}/reactivate`);
      setSuccess(`Employee ${emp.name} reactivated.`);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reactivate employee.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workforce Directory</h1>
          <p className="page-desc">Manage workers, technicians, daily wage rates, and contact profiles</p>
        </div>
        {isAdmin && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              + Register Employee
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
      <form className="filter-bar" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          className="form-control"
          placeholder="Search name, ID, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "240px" }}
        />

        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>

        <select
          className="form-select"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          <option value="Operations">Operations</option>
          <option value="Engineering">Engineering</option>
          <option value="Logistics">Logistics</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Administration">Administration</option>
        </select>

        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>

      {/* Employees Table */}
      {loading ? (
        <LoadingSpinner message="Loading employee directory..." />
      ) : employees.length === 0 ? (
        <EmptyState
          title="No employees found"
          message="Adjust search criteria or register a new workforce member."
          action={
            isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                Register Employee
              </button>
            )
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Employment</th>
                <th>Daily Wage</th>
                <th>Phone</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    <strong>{emp.employeeId || "-"}</strong>
                  </td>
                  <td>
                    <Link to={`/employees/${emp._id}`} style={{ fontWeight: 600 }}>
                      {emp.name || emp.Name}
                    </Link>
                  </td>
                  <td>{emp.department || "Operations"}</td>
                  <td>{emp.designation || "Worker"}</td>
                  <td>
                    <span className="badge badge-neutral">{emp.employmentType || "Daily Wage"}</span>
                  </td>
                  <td>₹{(emp.dailyWage || 0).toFixed(2)}</td>
                  <td>{emp.phone || emp.Number || "-"}</td>
                  <td>
                    <span className={`badge ${emp.isActive ? "badge-success" : "badge-danger"}`}>
                      {emp.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      <Link to={`/employees/${emp._id}`} className="btn btn-secondary btn-sm">
                        View
                      </Link>
                      {isAdmin && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(emp)}
                          >
                            Edit
                          </button>
                          {emp.isActive ? (
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => setDeactivateModal({ open: true, employee: emp, reason: "" })}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleReactivate(emp)}
                            >
                              Reactivate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployee ? `Edit Employee - ${editingEmployee.name}` : "Register New Employee"}
        maxWidth="600px"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Employee Code / ID</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. EMP-101 (optional, auto-generated)"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Worker full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="Mobile number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email (Optional)</label>
              <input
                type="email"
                className="form-control"
                placeholder="name@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-select"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="Operations">Operations</option>
                <option value="Engineering">Engineering</option>
                <option value="Logistics">Logistics</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Administration">Administration</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Designation / Role</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Welder, Field Driver, Helper"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Employment Type</label>
              <select
                className="form-select"
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
              >
                <option value="Daily Wage">Daily Wage</option>
                <option value="Monthly Salaried">Monthly Salaried</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Daily Wage (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={formData.dailyWage}
                onChange={(e) => setFormData({ ...formData, dailyWage: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              type="text"
              className="form-control"
              placeholder="Residential address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Additional workforce notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingEmployee ? "Save Changes" : "Create Employee"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={deactivateModal.open}
        onClose={() => setDeactivateModal({ open: false, employee: null, reason: "" })}
        title="Confirm Employee Deactivation"
        maxWidth="480px"
      >
        <p style={{ marginBottom: "12px", color: "var(--text-main)" }}>
          Are you sure you want to deactivate{" "}
          <strong>{deactivateModal.employee?.name}</strong>?
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
          Notice: Historical attendance, wages, advances, and payroll records will NOT be deleted and remain completely auditable.
        </p>

        <div className="form-group">
          <label className="form-label">Reason for Deactivation</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Resigned, End of project, Inactive"
            value={deactivateModal.reason}
            onChange={(e) => setDeactivateModal({ ...deactivateModal, reason: e.target.value })}
          />
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDeactivateModal({ open: false, employee: null, reason: "" })}
          >
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirmDeactivate}>
            Confirm Deactivation
          </button>
        </div>
      </Modal>
    </div>
  );
};
