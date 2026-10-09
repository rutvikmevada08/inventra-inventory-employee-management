<<<<<<< HEAD
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
=======
import { useState } from 'react';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import useFilters from '../hooks/useFilters';
import useAction from '../hooks/useAction';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import Alert from '../components/Alert';
import Modal from '../components/Modal';
import Field from '../components/Field';
import FileLink from '../components/FileLink';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDate, formatMoney, formatQty } from '../utils/format';
import { today } from '../utils/constants';

function FuelForm({ entry, isAdmin, onDone, onCancel }) {
  const editing = Boolean(entry?._id);
  const vehicles = useFetch('/vehicles', { limit: 200 });
  const stations = useFetch('/vendors', { limit: 200 });
  const users = useFetch('/users', { limit: 200 }, { skip: !isAdmin || editing });
  const [form, setForm] = useState({
    vehicle: entry?.vehicle?._id || '', vendor: entry?.vendor?._id || '', date: entry?.date?.slice(0, 10) || today(),
    litres: entry?.litres ?? '', costPerLitre: entry?.costPerLitre ?? '', invoiceNumber: entry?.invoiceNumber || '', fueledBy: '',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const total = Math.round((Number(form.litres) || 0) * (Number(form.costPerLitre) || 0) * 100) / 100;

  const submit = async (e) => {
    e.preventDefault();
    if (!editing && (!form.vehicle || !form.vendor)) return setError('Choose the vehicle and the fuel station');
    if (!(Number(form.litres) > 0)) return setError('Enter the litres filled');
    if (!(Number(form.costPerLitre) >= 0) || form.costPerLitre === '') return setError('Enter the rate per litre');
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/fuel/${entry._id}`, { date: form.date, litres: Number(form.litres), costPerLitre: Number(form.costPerLitre), invoiceNumber: form.invoiceNumber });
      } else {
        const body = new FormData();
        ['vehicle', 'vendor', 'date', 'litres', 'costPerLitre', 'invoiceNumber'].forEach((k) => form[k] !== '' && body.append(k, form[k]));
        if (isAdmin && form.fueledBy) body.append('fueledBy', form.fueledBy);
        if (file) body.append('invoice', file);
        await api.post('/fuel', body);
      }
      onDone(editing ? 'Fuel entry updated.' : 'Fuel entry saved.');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
    }
  };

  return (
<<<<<<< HEAD
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
=======
    <Modal title={editing ? 'Edit fuel entry' : 'Log fuel'} onClose={onCancel} wide
      footer={<><button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" form="fuel-form" className="btn btn-primary" disabled={busy}>Save</button></>}>
      <Alert tone="danger">{error}</Alert>
      <form id="fuel-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          {editing ? (
            <div className="full muted">{entry.vehicle?.name} ({entry.vehicle?.number}) at {entry.vendor?.name}</div>
          ) : (
            <>
              <Field label="Vehicle" required>
                <select className="select" value={form.vehicle} onChange={set('vehicle')}>
                  <option value="">Select a vehicle</option>
                  {(vehicles.data || []).map((v) => <option key={v._id} value={v._id}>{v.name} ({v.number})</option>)}
                </select>
              </Field>
              <Field label="Fuel station" required>
                <select className="select" value={form.vendor} onChange={set('vendor')}>
                  <option value="">Select a fuel station</option>
                  {(stations.data || []).map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
                </select>
              </Field>
            </>
          )}
          <Field label="Date" required><input className="input" type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label="Bill number"><input className="input" value={form.invoiceNumber} onChange={set('invoiceNumber')} /></Field>
          <Field label="Litres" required><input className="input" type="number" min="0" step="any" value={form.litres} onChange={set('litres')} /></Field>
          <Field label="Rate per litre" required><input className="input" type="number" min="0" step="any" value={form.costPerLitre} onChange={set('costPerLitre')} /></Field>
          <div className="full"><strong>Total: {formatMoney(total)}</strong> <span className="muted">Calculated from litres and rate</span></div>
          {!editing && <Field label="Bill copy" hint="JPG, PNG, WEBP or PDF" className="full"><input className="input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setFile(e.target.files[0] || null)} /></Field>}
          {isAdmin && !editing && (
            <Field label="Filled by" hint="Leave as yourself, or choose a colleague">
              <select className="select" value={form.fueledBy} onChange={set('fueledBy')}>
                <option value="">Myself</option>
                {(users.data || []).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </Field>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default function Fuel() {
  const { isAdmin } = useAuth();
  const { filters, set, setPage, params } = useFilters({ vehicle: '', vendor: '', from: '', to: '' });
  const vehicles = useFetch('/vehicles', { limit: 200, status: 'all' });
  const stations = useFetch('/vendors', { limit: 200, status: 'all' });
  const { data, meta, loading, error, reload } = useFetch('/fuel', { ...params, limit: 20 });
  const { busy, notice, setNotice, run } = useAction();
  const [dialog, setDialog] = useState(null);
  const finished = (message) => { setDialog(null); setNotice({ tone: 'success', text: message }); reload(); };

  const columns = [
    { key: 'date', header: 'Date', render: (f) => formatDate(f.date) },
    { key: 'vehicle', header: 'Vehicle', render: (f) => <>{f.vehicle?.name}<div className="muted" style={{ fontSize: 12 }}>{f.vehicle?.number}</div></> },
    { key: 'vendor', header: 'Fuel station', render: (f) => f.vendor?.name || '-' },
    { key: 'litres', header: 'Litres', align: 'num', render: (f) => formatQty(f.litres) },
    { key: 'costPerLitre', header: 'Rate', align: 'num', render: (f) => formatMoney(f.costPerLitre) },
    { key: 'total', header: 'Total', align: 'num', render: (f) => formatMoney(f.total) },
    { key: 'invoiceNumber', header: 'Bill number' },
    ...(isAdmin ? [{ key: 'by', header: 'Filled by', render: (f) => f.fueledBy?.name || '-' }] : []),
    { key: 'file', header: 'Bill', render: (f) => <FileLink file={f.invoiceFile} label="View" /> },
  ];
  if (isAdmin) {
    columns.push({
      key: 'actions', header: '', align: 'actions',
      render: (f) => (
        <>
          <button type="button" className="btn btn-link" onClick={() => setDialog({ type: 'form', entry: f })}>Edit</button>
          <button type="button" className="btn btn-link" onClick={() => setDialog({ type: 'remove', entry: f })}>Remove</button>
        </>
      ),
    });
  }

  return (
    <>
      <PageHeader title="Fuel" subtitle={isAdmin ? 'Fuel purchases for all vehicles' : 'Your fuel entries'}>
        <button type="button" className="btn btn-primary" onClick={() => setDialog({ type: 'form' })}>Log fuel</button>
      </PageHeader>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <Alert tone="danger">{error}</Alert>
      <div className="stats">
        <div className="stat"><div className="label">Litres (current filters)</div><div className="value">{formatQty(meta?.totalLitres ?? 0)}</div></div>
        <div className="stat"><div className="label">Amount (current filters)</div><div className="value">{formatMoney(meta?.totalAmount ?? 0)}</div></div>
      </div>
      <div className="toolbar">
        <select className="select" aria-label="Vehicle" value={filters.vehicle} onChange={set('vehicle')}>
          <option value="">All vehicles</option>
          {(vehicles.data || []).map((v) => <option key={v._id} value={v._id}>{v.name} ({v.number})</option>)}
        </select>
        <select className="select" aria-label="Fuel station" value={filters.vendor} onChange={set('vendor')}>
          <option value="">All fuel stations</option>
          {(stations.data || []).map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
        </select>
        <input className="input" type="date" aria-label="From date" value={filters.from} onChange={set('from')} style={{ maxWidth: 150 }} />
        <input className="input" type="date" aria-label="To date" value={filters.to} onChange={set('to')} style={{ maxWidth: 150 }} />
      </div>
      <DataTable columns={columns} rows={data} loading={loading} emptyMessage="No fuel entries match these filters." />
      <Pagination meta={meta} onPage={setPage} />

      {dialog?.type === 'form' && <FuelForm entry={dialog.entry} isAdmin={isAdmin} onCancel={() => setDialog(null)} onDone={finished} />}
      {dialog?.type === 'remove' && (
        <ConfirmDialog title="Remove fuel entry" danger confirmLabel="Remove entry" busy={busy} onCancel={() => setDialog(null)}
          message="The entry will no longer appear in lists, totals or exports. It is kept in the database."
          onConfirm={async () => { const r = await run(() => api.delete(`/fuel/${dialog.entry._id}`), 'Fuel entry removed.'); setDialog(null); if (r.ok) reload(); }} />
      )}
    </>
  );
}
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
