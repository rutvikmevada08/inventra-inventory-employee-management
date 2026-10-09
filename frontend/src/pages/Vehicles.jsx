<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    Vehicle_name: "",
    Vehicle_number: "",
    type: "Car",
    status: "Active",
    notes: "",
  });

  const { isAdmin } = useAuth();

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/vehicles");
      setVehicles(res.data.vehicles || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      Vehicle_name: "",
      Vehicle_number: "",
      type: "Car",
      status: "Active",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVehicle(v);
    setFormData({
      Vehicle_name: v.Vehicle_name,
      Vehicle_number: v.Vehicle_number,
      type: v.type || "Car",
      status: v.status || "Active",
      notes: v.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.Vehicle_name || !formData.Vehicle_number) return;
    try {
      setError("");
      if (editingVehicle) {
        await API.put(`/vehicles/${editingVehicle._id}`, formData);
        setSuccess("Vehicle details updated.");
      } else {
        await API.post("/vehicles", formData);
        setSuccess("Vehicle registered successfully.");
      }
      setIsModalOpen(false);
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save vehicle.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Company Fleet & Vehicles</h1>
          <p className="page-desc">Track project vehicles (e.g. Bolero, Thar, Fortuner), registration numbers, and operational readiness.</p>
        </div>

        {isAdmin && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              + Register Vehicle
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

      {loading ? (
        <LoadingSpinner message="Loading fleet vehicles..." />
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No vehicles registered"
          message="Register project vehicles to log refuel entries and maintenance."
          action={
            isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                Register Vehicle
              </button>
            )
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle Name</th>
                <th>Registration Plate</th>
                <th>Vehicle Type</th>
                <th>Operational Status</th>
                <th>Notes</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v._id}>
                  <td><strong>{v.Vehicle_name}</strong></td>
                  <td><strong>{v.Vehicle_number}</strong></td>
                  <td>{v.type || "Car"}</td>
                  <td>
                    <span
                      className={`badge ${
                        v.status === "Active"
                          ? "badge-success"
                          : v.status === "Under Maintenance"
                          ? "badge-warning"
                          : "badge-danger"
                      }`}
                    >
                      {v.status || "Active"}
                    </span>
                  </td>
                  <td>{v.notes || "-"}</td>
                  {isAdmin && (
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(v)}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Vehicle Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVehicle ? `Edit Vehicle - ${editingVehicle.Vehicle_name}` : "Register Fleet Vehicle"}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Vehicle Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Bolero, Thar, Fortuner"
              value={formData.Vehicle_name}
              onChange={(e) => setFormData({ ...formData, Vehicle_name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Registration Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. MP-04-AB-1234"
                value={formData.Vehicle_number}
                onChange={(e) => setFormData({ ...formData, Vehicle_number: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Type</label>
              <select
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="Car">Car / SUV</option>
                <option value="Truck">Truck / Logistics</option>
                <option value="Bike">Two-Wheeler</option>
                <option value="Other">Other Equipment</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <input
              type="text"
              className="form-control"
              placeholder="Assigned driver, insurance expiry, notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingVehicle ? "Save Changes" : "Register Vehicle"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
=======
import SimpleCrudPage from '../components/SimpleCrudPage';

const config = {
  title: 'Vehicles',
  subtitle: 'Vehicles that are refuelled',
  noun: 'Vehicle',
  endpoint: '/vehicles',
  searchPlaceholder: 'Search by name or number',
  fields: [
    { key: 'name', label: 'Vehicle name', required: true, full: true },
    { key: 'number', label: 'Registration number', required: true, hint: 'For example GJ 06 AB 1234' },
    { key: 'notes', label: 'Notes', full: true },
  ],
  columns: [
    { key: 'name', header: 'Vehicle' },
    { key: 'number', header: 'Registration number' },
    { key: 'notes', header: 'Notes' },
  ],
};

export default function Vehicles() {
  return <SimpleCrudPage config={config} />;
}
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
