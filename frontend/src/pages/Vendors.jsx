<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    Business_name: "",
    Business_email: "",
    Business_contact_number: "",
    address: "",
    notes: "",
  });

  const { isAdmin } = useAuth();

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (search) params.search = search;
      const res = await API.get("/vendors", { params });
      setVendors(res.data.vendors || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormData({
      Business_name: "",
      Business_email: "",
      Business_contact_number: "",
      address: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVendor(v);
    setFormData({
      Business_name: v.Business_name,
      Business_email: v.Business_email || "",
      Business_contact_number: String(v.Business_contact_number || ""),
      address: v.address || "",
      notes: v.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.Business_name || !formData.Business_contact_number) return;
    try {
      setError("");
      if (editingVendor) {
        await API.put(`/vendors/${editingVendor._id}`, formData);
        setSuccess("Vendor updated successfully.");
      } else {
        await API.post("/vendors", formData);
        setSuccess("Vendor created successfully.");
      }
      setIsModalOpen(false);
      fetchVendors();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save vendor.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendor Directory</h1>
          <p className="page-desc">Manage suppliers, hardware fabricators, fuel stations, and corporate service providers.</p>
        </div>

        {isAdmin && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              + Register Vendor
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

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="form-control"
          placeholder="Search vendor name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "260px" }}
        />
        <button className="btn btn-secondary" onClick={fetchVendors}>
          Search
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading vendors..." />
      ) : vendors.length === 0 ? (
        <EmptyState
          title="No vendors found"
          message="Register a new supplier or vendor to attach to purchases and fuel records."
          action={
            isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                Register Vendor
              </button>
            )
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Vendor / Business Name</th>
                <th>Contact Phone</th>
                <th>Business Email</th>
                <th>Address</th>
                <th>Status</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v._id}>
                  <td><strong>{v.Business_name}</strong></td>
                  <td>{v.Business_contact_number}</td>
                  <td>{v.Business_email || "-"}</td>
                  <td>{v.address || "-"}</td>
                  <td>
                    <span className={`badge ${v.isActive ? "badge-success" : "badge-neutral"}`}>
                      {v.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
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

      {/* Add / Edit Vendor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? `Edit Vendor - ${editingVendor.Business_name}` : "Register New Vendor"}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Vendor Business Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Acme Industrial Supplies"
              value={formData.Business_name}
              onChange={(e) => setFormData({ ...formData, Business_name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contact Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Phone or mobile number"
                value={formData.Business_contact_number}
                onChange={(e) => setFormData({ ...formData, Business_contact_number: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="supplier@domain.com"
                value={formData.Business_email}
                onChange={(e) => setFormData({ ...formData, Business_email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              type="text"
              className="form-control"
              placeholder="Business physical address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Payment terms, bank details, supply items..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingVendor ? "Save Changes" : "Create Vendor"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
=======
import { useEffect, useState } from 'react';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import VendorForm from '../components/VendorForm';
import VendorSummary from '../components/VendorSummary';

export default function Vendors() {
  const { isAdmin } = useAuth();
  const [q, setQ] = useState('');
  const search = useDebounce(q);
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // {} while adding, a vendor while editing
  const [viewing, setViewing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const { data, meta, loading, error, reload } = useFetch('/vendors', { q: search || undefined, status, page, limit: 20 });
  useEffect(() => setPage(1), [search, status]);

  const saved = (message) => { setEditing(null); setNotice({ tone: 'success', text: message }); reload(); };

  const changeStatus = async () => {
    const { vendor, action } = confirm;
    setBusy(true);
    try {
      if (action === 'deactivate') await api.delete(`/vendors/${vendor._id}`);
      else await api.post(`/vendors/${vendor._id}/reactivate`);
      setNotice({ tone: 'success', text: action === 'deactivate' ? `${vendor.name} deactivated.` : `${vendor.name} reactivated.` });
      reload();
    } catch (err) {
      setNotice({ tone: 'danger', text: errorMessage(err) });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const columns = [
    { key: 'name', header: 'Vendor', render: (v) => (isAdmin ? <button type="button" className="btn btn-link" onClick={() => setViewing(v)}>{v.name}</button> : v.name) },
    { key: 'contactPerson', header: 'Contact person' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    { key: 'gstin', header: 'GSTIN' },
    { key: 'isActive', header: 'Status', render: (v) => <Badge status={v.isActive === false ? 'inactive' : 'active'}>{v.isActive === false ? 'Inactive' : 'Active'}</Badge> },
  ];
  if (isAdmin) {
    columns.push({
      key: 'actions', header: '', align: 'actions',
      render: (v) => (
        <>
          <button type="button" className="btn btn-link" onClick={() => setEditing(v)}>Edit</button>
          {v.isActive === false
            ? <button type="button" className="btn btn-link" onClick={() => setConfirm({ vendor: v, action: 'reactivate' })}>Reactivate</button>
            : <button type="button" className="btn btn-link" onClick={() => setConfirm({ vendor: v, action: 'deactivate' })}>Deactivate</button>}
        </>
      ),
    });
  }

  return (
    <>
      <PageHeader title="Vendors" subtitle="Suppliers and fuel stations">
        {isAdmin && <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>Add vendor</button>}
      </PageHeader>

      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <Alert tone="danger">{error}</Alert>

      <div className="toolbar">
        <input className="input" type="search" placeholder="Search by name, contact or phone" aria-label="Search vendors" value={q} onChange={(e) => setQ(e.target.value)} />
        {isAdmin && (
          <select className="select" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        )}
      </div>

      <DataTable columns={columns} rows={data} loading={loading} emptyMessage={search ? 'No vendors match your search.' : 'No vendors have been added yet.'} />
      <Pagination meta={meta} onPage={setPage} />

      {editing && <VendorForm vendor={editing} onSaved={saved} onCancel={() => setEditing(null)} />}
      {viewing && <VendorSummary vendor={viewing} onClose={() => setViewing(null)} />}
      {confirm && (
        <ConfirmDialog
          title={confirm.action === 'deactivate' ? 'Deactivate vendor' : 'Reactivate vendor'}
          message={confirm.action === 'deactivate'
            ? `${confirm.vendor.name} will no longer appear in lists or forms. Existing purchases and payments are kept.`
            : `${confirm.vendor.name} will be available again.`}
          confirmLabel={confirm.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
          danger={confirm.action === 'deactivate'}
          busy={busy}
          onConfirm={changeStatus}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
