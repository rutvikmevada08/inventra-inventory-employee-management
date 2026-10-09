<<<<<<< HEAD
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
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Field from '../components/Field';
import ConfirmDialog from '../components/ConfirmDialog';
import ReasonModal from '../components/ReasonModal';
import { formatDate, formatQty } from '../utils/format';

const LABEL = { requested: 'Requested', approved: 'Approved', rejected: 'Rejected' };

function NewRequest({ onDone, onCancel }) {
  const types = useFetch('/item-types', { limit: 200 });
  const [form, setForm] = useState({ itemType: '', quantity: '', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const unit = (types.data || []).find((t) => t._id === form.itemType)?.unit;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.itemType) return setError('Choose an item');
    if (!(Number(form.quantity) > 0)) return setError('Enter a quantity greater than zero');
    if (!form.reason.trim()) return setError('Tell us what the item is needed for');
    setBusy(true);
    try {
      await api.post('/item-requests', { ...form, quantity: Number(form.quantity) });
      onDone('Request submitted.');
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
=======
    <Modal title="New item request" onClose={onCancel}
      footer={<><button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" form="request-form" className="btn btn-primary" disabled={busy}>Submit request</button></>}>
      <Alert tone="danger">{error}</Alert>
      <form id="request-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Item" required className="full">
            <select className="select" value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value })}>
              <option value="">Select an item</option>
              {(types.data || []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label={`Quantity${unit ? ` (${unit})` : ''}`} required><input className="input" type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
          <Field label="Needed for" required className="full"><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        </div>
      </form>
    </Modal>
  );
}

export default function ItemRequests() {
  const { isAdmin } = useAuth();
  const { filters, set, setPage, params } = useFilters({ status: '' });
  const { data, meta, loading, error, reload } = useFetch('/item-requests', { ...params, limit: 20 });
  const { busy, notice, setNotice, run } = useAction();
  const [dialog, setDialog] = useState(null); // { type: 'new' | 'approve' | 'reject', row }

  const approve = async () => {
    const r = await run(() => api.post(`/item-requests/${dialog.row._id}/approve`, {}), 'Request approved.');
    setDialog(null);
    if (r.ok) reload();
  };

  const columns = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    ...(isAdmin ? [{ key: 'by', header: 'Requested by', render: (r) => r.requestedBy?.name || '-' }] : []),
    { key: 'item', header: 'Item', render: (r) => r.itemType?.name || '-' },
    { key: 'quantity', header: 'Quantity', align: 'num', render: (r) => `${formatQty(r.quantity)} ${r.itemType?.unit || ''}` },
    { key: 'reason', header: 'Needed for' },
    {
      key: 'status', header: 'Status',
      render: (r) => (
        <>
          <Badge status={r.status}>{LABEL[r.status]}</Badge>
          {r.status !== 'requested' && <div className="muted" style={{ fontSize: 12 }}>{r.decidedBy?.name ? `${r.decidedBy.name}, ` : ''}{formatDate(r.decidedAt)}{r.rejectionReason ? `: ${r.rejectionReason}` : ''}</div>}
        </>
      ),
    },
  ];
  if (isAdmin) {
    columns.push({
      key: 'actions', header: '', align: 'actions',
      render: (r) => r.status === 'requested' && (
        <>
          <button type="button" className="btn btn-link" onClick={() => setDialog({ type: 'approve', row: r })}>Approve</button>
          <button type="button" className="btn btn-link" onClick={() => setDialog({ type: 'reject', row: r })}>Reject</button>
        </>
      ),
    });
  }

  return (
    <>
      <PageHeader title="Item requests" subtitle={isAdmin ? 'Requests from staff for items and services' : 'Your requests for items and services'}>
        <button type="button" className="btn btn-primary" onClick={() => setDialog({ type: 'new' })}>New request</button>
      </PageHeader>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <Alert tone="danger">{error}</Alert>
      <div className="toolbar">
        <select className="select" aria-label="Status" value={filters.status} onChange={set('status')}>
          <option value="">All statuses</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <DataTable columns={columns} rows={data} loading={loading} emptyMessage={filters.status ? 'No requests with this status.' : 'No item requests yet.'} />
      <Pagination meta={meta} onPage={setPage} />

      {dialog?.type === 'new' && <NewRequest onCancel={() => setDialog(null)} onDone={(m) => { setDialog(null); setNotice({ tone: 'success', text: m }); reload(); }} />}
      {dialog?.type === 'approve' && (
        <ConfirmDialog
          title="Approve request" confirmLabel="Approve" busy={busy} onConfirm={approve} onCancel={() => setDialog(null)}
          message={dialog.row.itemType?.isStockable === false
            ? `Approve the request for ${dialog.row.itemType.name}? This is a service, so no stock is issued.`
            : `Approve ${formatQty(dialog.row.quantity)} ${dialog.row.itemType?.unit || ''} of ${dialog.row.itemType?.name} for ${dialog.row.requestedBy?.name}? The quantity is issued from stock now. This is refused if there is not enough stock.`}
        />
      )}
      {dialog?.type === 'reject' && (
        <ReasonModal
          title="Reject request" label="Reason" hint="Shown to the person who made the request" confirmLabel="Reject request" danger
          onCancel={() => setDialog(null)}
          onSubmit={async (reason) => { await api.post(`/item-requests/${dialog.row._id}/reject`, { reason }); setDialog(null); setNotice({ tone: 'success', text: 'Request rejected.' }); reload(); }}
        />
      )}
    </>
  );
}
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
