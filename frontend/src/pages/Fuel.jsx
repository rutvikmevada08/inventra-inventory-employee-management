import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const Fuel = () => {
  const [fuelRecords, setFuelRecords] = useState([]);
  const [totals, setTotals] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [vehicleFilter, setVehicleFilter] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    Vehicle_num: "",
    Vendor: "",
    Fueled_by: "",
    Date: new Date().toISOString().split("T")[0],
    Litre: "",
    Cost_per_litre: "",
    Total: "",
    Invoice_number: "",
    Fuel_type: "Diesel",
    notes: "",
  });
  const [invoiceFile, setInvoiceFile] = useState(null);

  // Auth check if needed
  const fetchFuel = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (vehicleFilter) params.vehicleId = vehicleFilter;

      const [fuelRes, vehRes, venRes, empRes] = await Promise.all([
        API.get("/fuel", { params }),
        API.get("/vehicles"),
        API.get("/vendors?status=active"),
        API.get("/employees?status=active"),
      ]);

      setFuelRecords(fuelRes.data.fuelRecords || []);
      setTotals(fuelRes.data.totals || {});
      setVehicles(vehRes.data.vehicles || []);
      setVendors(venRes.data.vendors || []);
      setEmployees(empRes.data.employees || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load fuel records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuel();
  }, [vehicleFilter]);

  const handleOpenAdd = () => {
    setFormData({
      Vehicle_num: vehicles.length > 0 ? vehicles[0]._id : "",
      Vendor: vendors.length > 0 ? vendors[0]._id : "",
      Fueled_by: employees.length > 0 ? employees[0]._id : "",
      Date: new Date().toISOString().split("T")[0],
      Litre: "",
      Cost_per_litre: "",
      Total: "",
      Invoice_number: "",
      Fuel_type: "Diesel",
      notes: "",
    });
    setInvoiceFile(null);
    setIsModalOpen(true);
  };

  const handleCalcTotal = (field, val) => {
    const updated = { ...formData, [field]: val };
    const litres = Number(updated.Litre) || 0;
    const rate = Number(updated.Cost_per_litre) || 0;
    if (litres > 0 && rate > 0) {
      updated.Total = (litres * rate).toFixed(2);
    }
    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.Vehicle_num || !formData.Vendor || !formData.Litre || !formData.Total) {
      setError("Please complete all required fuel purchase fields.");
      return;
    }

    try {
      setError("");
      const data = new FormData();
      Object.keys(formData).forEach((key) => data.append(key, formData[key]));
      if (invoiceFile) {
        data.append("invoice", invoiceFile);
      }

      await API.post("/fuel", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Refuel entry and invoice saved.");
      setIsModalOpen(false);
      fetchFuel();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record fuel purchase.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet Refuel Log</h1>
          <p className="page-desc">Track fuel purchases, litre consumption, fuel bills, and vendor receipts across vehicles.</p>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + Log Refuel Purchase
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

      {/* Summary Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Litres Consumed</div>
          <div className="metric-value">{totals.totalLitres || 0} L</div>
          <div className="metric-sub">Across filtered entries</div>
        </div>
        <div className="metric-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="metric-label">Total Fuel Expenditure</div>
          <div className="metric-value" style={{ color: "var(--primary)" }}>
            ₹{(totals.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Total fuel expense sum</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg. Rate / Litre</div>
          <div className="metric-value">₹{(totals.averageCostPerLitre || 0).toFixed(2)}</div>
          <div className="metric-sub">Weighted cost per litre</div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          style={{ width: "220px" }}
        >
          <option value="">All Fleet Vehicles</option>
          {vehicles.map((v) => (
            <option key={v._id} value={v._id}>
              {v.Vehicle_name} ({v.Vehicle_number})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading fuel records..." />
      ) : fuelRecords.length === 0 ? (
        <EmptyState
          title="No fuel entries found"
          message="Log refuel purchases to track fleet vehicle mileage and fuel bills."
          action={
            <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              Log Refuel Purchase
            </button>
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Litres</th>
                <th>Rate / L (₹)</th>
                <th>Total Bill (₹)</th>
                <th>Fuel Station / Vendor</th>
                <th>Driver / Fueled By</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {fuelRecords.map((f) => (
                <tr key={f._id}>
                  <td>{new Date(f.Date).toLocaleDateString()}</td>
                  <td>
                    <strong>{f.Vehicle_num?.Vehicle_name}</strong>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {f.Vehicle_num?.Vehicle_number}
                    </div>
                  </td>
                  <td><strong>{f.Litre} L</strong> ({f.Fuel_type || "Diesel"})</td>
                  <td>₹{(f.Cost_per_litre || 0).toFixed(2)}</td>
                  <td style={{ fontWeight: 700, fontSize: "14px", color: "var(--primary)" }}>
                    ₹{(f.Total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td>{f.Vendor?.Business_name || "-"}</td>
                  <td>{f.Fueled_by ? f.Fueled_by.name : "-"}</td>
                  <td>
                    {f.Invoice ? (
                      <a href={f.Invoice.startsWith("/") ? f.Invoice : `/${f.Invoice}`} target="_blank" rel="noopener noreferrer">
                        {f.Invoice_number ? `#${f.Invoice_number}` : "View Slip"}
                      </a>
                    ) : (
                      f.Invoice_number || "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Refuel Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Refuel Purchase" maxWidth="600px">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vehicle *</label>
              <select
                className="form-select"
                value={formData.Vehicle_num}
                onChange={(e) => setFormData({ ...formData, Vehicle_num: e.target.value })}
                required
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.Vehicle_name} ({v.Vehicle_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Fuel Station / Vendor *</label>
              <select
                className="form-select"
                value={formData.Vendor}
                onChange={(e) => setFormData({ ...formData, Vendor: e.target.value })}
                required
              >
                <option value="">Select fuel vendor...</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.Business_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fueled By *</label>
              <select
                className="form-select"
                value={formData.Fueled_by}
                onChange={(e) => setFormData({ ...formData, Fueled_by: e.target.value })}
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
              <label className="form-label">Date *</label>
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
              <label className="form-label">Quantity in Litres *</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                className="form-control"
                placeholder="e.g. 45.5"
                value={formData.Litre}
                onChange={(e) => handleCalcTotal("Litre", e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rate / Litre (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                placeholder="e.g. 92.50"
                value={formData.Cost_per_litre}
                onChange={(e) => handleCalcTotal("Cost_per_litre", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="form-control"
                placeholder="Total fuel cost"
                value={formData.Total}
                onChange={(e) => setFormData({ ...formData, Total: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Invoice / Receipt No.</label>
              <input
                type="text"
                className="form-control"
                placeholder="Bill slip number"
                value={formData.Invoice_number}
                onChange={(e) => setFormData({ ...formData, Invoice_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fuel Type</label>
              <select
                className="form-select"
                value={formData.Fuel_type}
                onChange={(e) => setFormData({ ...formData, Fuel_type: e.target.value })}
              >
                <option value="Diesel">Diesel</option>
                <option value="Petrol">Petrol</option>
                <option value="CNG">CNG</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Attach Fuel Receipt</label>
            <input
              type="file"
              className="form-control"
              accept=".jpg,.jpeg,.png,.pdf,.webp"
              onChange={(e) => setInvoiceFile(e.target.files[0] || null)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Log Refuel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
