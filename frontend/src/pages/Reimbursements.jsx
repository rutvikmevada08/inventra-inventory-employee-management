<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const Reimbursements = () => {
  const [reimbursements, setReimbursements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    Amount: "",
    Spent_on: "",
    Vendor: "",
    Invoice_number: "",
    Date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [invoiceFile, setInvoiceFile] = useState(null);

  // Pay Modal
  const [payModal, setPayModal] = useState({ open: false, item: null, paidBy: "Sanjeev Sharma" });

  const { isAdmin } = useAuth();

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [reimbRes, empRes] = await Promise.all([
        API.get("/reimbursements", { params }),
        API.get("/employees?status=active"),
      ]);

      setReimbursements(reimbRes.data.reimbursements || []);
      setSummary(reimbRes.data.summary || {});
      setEmployees(empRes.data.employees || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load reimbursements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReimbursements();
  }, [statusFilter]);

  const handleOpenAdd = () => {
    setFormData({
      employeeId: employees.length > 0 ? employees[0]._id : "",
      Amount: "",
      Spent_on: "",
      Vendor: "",
      Invoice_number: "",
      Date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setInvoiceFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.Amount || !formData.Spent_on) return;

    try {
      setError("");
      const data = new FormData();
      Object.keys(formData).forEach((k) => data.append(k, formData[k]));
      if (invoiceFile) {
        data.append("invoice", invoiceFile);
      }

      await API.post("/reimbursements", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Reimbursement claim submitted.");
      setIsModalOpen(false);
      fetchReimbursements();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit reimbursement.");
    }
  };

  const handleApprove = async (id) => {
    try {
      setError("");
      await API.post(`/reimbursements/${id}/approve`);
      setSuccess("Reimbursement approved.");
      fetchReimbursements();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to approve claim.");
    }
  };

  const handlePayConfirm = async (e) => {
    e.preventDefault();
    if (!payModal.item) return;

    try {
      setError("");
      await API.post(`/reimbursements/${payModal.item._id}/pay`, { paidBy: payModal.paidBy });
      setSuccess("Reimbursement disbursed and locked.");
      setPayModal({ open: false, item: null, paidBy: "Sanjeev Sharma" });
      fetchReimbursements();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to disburse reimbursement.");
=======
import { useState } from 'react';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import useFilters from '../hooks/useFilters';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Field from '../components/Field';
import FileLink from '../components/FileLink';
import ReasonModal from '../components/ReasonModal';
import { formatDate, formatMoney } from '../utils/format';
import { PAYMENT_METHODS, today } from '../utils/constants';

const LABEL = { requested: 'Requested', approved: 'Approved', paid: 'Paid', rejected: 'Rejected' };

function ClaimForm({ isAdmin, onDone, onCancel }) {
  const users = useFetch('/users', { limit: 200 }, { skip: !isAdmin });
  const [form, setForm] = useState({ date: today(), amount: '', spentOn: '', vendorName: '', invoiceNumber: '', claimant: '', preApproved: false });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.spentOn.trim()) return setError('Describe what the expense was for');
    if (!(Number(form.amount) > 0)) return setError('Enter an amount greater than zero');
    const body = new FormData();
    ['date', 'amount', 'spentOn', 'vendorName', 'invoiceNumber'].forEach((k) => form[k] && body.append(k, form[k]));
    if (isAdmin && form.claimant) body.append('claimant', form.claimant);
    if (isAdmin && form.preApproved) body.append('status', 'approved');
    if (file) body.append('invoice', file);
    setBusy(true);
    try {
      await api.post('/reimbursements', body);
      onDone('Reimbursement saved.');
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
          <h1 className="page-title">Expense Reimbursements</h1>
          <p className="page-desc">
            4-Stage lifecycle: Requested &rarr; Approved &rarr; Paid &rarr; Locked. Immutable once disbursed.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + Submit Expense Claim
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

      {/* Summary Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Claims Count</div>
          <div className="metric-value">{summary.totalCount || 0}</div>
          <div className="metric-sub">Submitted expense receipts</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pending Approval</div>
          <div className="metric-value" style={{ color: "var(--warning)" }}>
            ₹{(summary.pendingAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Awaiting disbursement</div>
        </div>
        <div className="metric-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div className="metric-label">Settled & Locked</div>
          <div className="metric-value" style={{ color: "var(--success)" }}>
            ₹{(summary.paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Disbursed to workforce</div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: "200px" }}
        >
          <option value="">All Workflow Stages</option>
          <option value="Requested">Requested (Initial)</option>
          <option value="Approved">Approved (Ready to Pay)</option>
          <option value="Paid">Paid / Reimbursed (Locked)</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading reimbursement claims..." />
      ) : reimbursements.length === 0 ? (
        <EmptyState
          title="No reimbursement claims found"
          message="Submit an expense receipt to request reimbursement for project materials or travel."
          action={
            <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              Submit Expense Claim
            </button>
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Purpose / Spent On</th>
                <th>Vendor</th>
                <th>Amount (₹)</th>
                <th>Receipt / Invoice</th>
                <th>Status</th>
                <th>Disbursed By</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {reimbursements.map((r) => {
                const isLocked = ["Paid", "Reimbursed"].includes(r.Status);
                return (
                  <tr key={r._id}>
                    <td>{new Date(r.Date).toLocaleDateString()}</td>
                    <td>
                      <strong>{r.employee?.name}</strong>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {r.employee?.department}
                      </div>
                    </td>
                    <td>{r.Spent_on}</td>
                    <td>{r.Vendor || "-"}</td>
                    <td style={{ fontWeight: 700, fontSize: "14px", color: isLocked ? "var(--success)" : "var(--primary)" }}>
                      ₹{(r.Amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      {r.Invoice ? (
                        <a href={r.Invoice.startsWith("/") ? r.Invoice : `/${r.Invoice}`} target="_blank" rel="noopener noreferrer">
                          {r.Invoice_number ? `#${r.Invoice_number}` : "View Slip"}
                        </a>
                      ) : (
                        r.Invoice_number || "-"
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          isLocked
                            ? "badge-success"
                            : r.Status === "Approved"
                            ? "badge-info"
                            : r.Status === "Requested"
                            ? "badge-warning"
                            : "badge-danger"
                        }`}
                      >
                        {isLocked ? "Paid & Locked" : r.Status}
                      </span>
                    </td>
                    <td>{r.Paid_by || "-"}</td>
                    {isAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {r.Status === "Requested" && (
                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(r._id)}>
                              Approve
                            </button>
                          )}
                          {!isLocked && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setPayModal({ open: true, item: r, paidBy: "Sanjeev Sharma" })}
                            >
                              Disburse
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit Claim Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit Expense Reimbursement Claim" maxWidth="600px">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
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
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Claim Date *</label>
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
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="form-control"
                placeholder="Disbursement Amount"
                value={formData.Amount}
                onChange={(e) => setFormData({ ...formData, Amount: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vendor / Merchant</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Local Hardware, Taxi Service"
                value={formData.Vendor}
                onChange={(e) => setFormData({ ...formData, Vendor: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Purpose / Spent On *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Emergency electrical wires, testing cable, auto fare"
              value={formData.Spent_on}
              onChange={(e) => setFormData({ ...formData, Spent_on: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Invoice / Receipt No.</label>
              <input
                type="text"
                className="form-control"
                placeholder="Receipt slip number"
                value={formData.Invoice_number}
                onChange={(e) => setFormData({ ...formData, Invoice_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Attach Receipt Slip</label>
              <input
                type="file"
                className="form-control"
                accept=".jpg,.jpeg,.png,.pdf,.webp"
                onChange={(e) => setInvoiceFile(e.target.files[0] || null)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Claim
            </button>
          </div>
        </form>
      </Modal>

      {/* Disburse Modal */}
      <Modal
        isOpen={payModal.open}
        onClose={() => setPayModal({ open: false, item: null, paidBy: "Sanjeev Sharma" })}
        title={`Disburse Reimbursement to ${payModal.item?.employee?.name}`}
        maxWidth="460px"
      >
        <form onSubmit={handlePayConfirm}>
          <p style={{ marginBottom: "14px", fontSize: "13px" }}>
            Disbursing <strong>₹{payModal.item?.Amount?.toFixed(2)}</strong> for purpose:{" "}
            <em>"{payModal.item?.Spent_on}"</em>. This action will lock the claim from future modification.
          </p>

          <div className="form-group">
            <label className="form-label">Paid By (Disbursing Officer) *</label>
            <input
              type="text"
              className="form-control"
              value={payModal.paidBy}
              onChange={(e) => setPayModal({ ...payModal, paidBy: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPayModal({ open: false, item: null, paidBy: "Sanjeev Sharma" })}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-success">
              Confirm & Lock
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
=======
    <Modal title="New reimbursement" onClose={onCancel} wide
      footer={<><button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" form="claim-form" className="btn btn-primary" disabled={busy}>{isAdmin ? 'Save' : 'Submit request'}</button></>}>
      <Alert tone="danger">{error}</Alert>
      <form id="claim-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="What was it for" required className="full"><input className="input" value={form.spentOn} onChange={set('spentOn')} autoFocus /></Field>
          <Field label="Amount" required><input className="input" type="number" min="0" step="any" value={form.amount} onChange={set('amount')} /></Field>
          <Field label="Date of expense" required><input className="input" type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label="Vendor or shop"><input className="input" value={form.vendorName} onChange={set('vendorName')} /></Field>
          <Field label="Bill number"><input className="input" value={form.invoiceNumber} onChange={set('invoiceNumber')} /></Field>
          <Field label="Bill copy" hint="JPG, PNG, WEBP or PDF" className="full"><input className="input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setFile(e.target.files[0] || null)} /></Field>
          {isAdmin && (
            <>
              <Field label="On behalf of" hint="Leave as yourself, or choose a colleague">
                <select className="select" value={form.claimant} onChange={set('claimant')}>
                  <option value="">Myself</option>
                  {(users.data || []).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </Field>
              <label className="check"><input type="checkbox" checked={form.preApproved} onChange={set('preApproved')} /><span>Already approved<span className="field-hint"> Skip the request step</span></span></label>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}

function PayModal({ row, onDone, onCancel }) {
  const [form, setForm] = useState({ paidAt: today(), paymentMethod: 'Bank transfer', paymentReference: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/reimbursements/${row._id}/pay`, form);
      onDone('Marked as paid.');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };
  return (
    <Modal title="Mark as paid" onClose={onCancel}
      footer={<><button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" form="pay-form" className="btn btn-primary" disabled={busy}>Mark as paid</button></>}>
      <Alert tone="danger">{error}</Alert>
      <p className="muted" style={{ marginBottom: 14 }}>{formatMoney(row.amount)} to {row.claimant?.name}. A paid reimbursement cannot be edited or removed.</p>
      <form id="pay-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Payment date"><input className="input" type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} /></Field>
          <Field label="Method"><select className="select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Reference" className="full" hint="Transaction or cheque number"><input className="input" value={form.paymentReference} onChange={(e) => setForm({ ...form, paymentReference: e.target.value })} /></Field>
        </div>
      </form>
    </Modal>
  );
}

export default function Reimbursements() {
  const { isAdmin } = useAuth();
  const { filters, set, setPage, params } = useFilters({ q: '', status: '', claimant: '', from: '', to: '' });
  const { page, ...filterParams } = params;
  const users = useFetch('/users', { limit: 200, status: 'all' }, { skip: !isAdmin });
  const list = useFetch('/reimbursements', { ...params, limit: 20 });
  const summary = useFetch('/reimbursements/summary', filterParams);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);
  const refresh = (message) => { setDialog(null); setNotice({ tone: 'success', text: message }); list.reload(); summary.reload(); };

  const columns = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    ...(isAdmin ? [{ key: 'claimant', header: 'Claimant', render: (r) => r.claimant?.name || '-' }] : []),
    { key: 'spentOn', header: 'Description' },
    { key: 'vendor', header: 'Vendor / bill', render: (r) => <>{r.vendorName || '-'}{r.invoiceNumber && <div className="muted" style={{ fontSize: 12 }}>{r.invoiceNumber}</div>}</> },
    { key: 'amount', header: 'Amount', align: 'num', render: (r) => formatMoney(r.amount) },
    {
      key: 'status', header: 'Status',
      render: (r) => (
        <>
          <Badge status={r.status}>{LABEL[r.status]}</Badge>
          {r.status === 'paid' && <div className="muted" style={{ fontSize: 12 }}>{formatDate(r.paidAt)}{r.paymentMethod ? `, ${r.paymentMethod}` : ''}</div>}
          {r.status === 'rejected' && r.rejectionReason && <div className="muted" style={{ fontSize: 12 }}>{r.rejectionReason}</div>}
        </>
      ),
    },
    { key: 'invoice', header: 'Bill', render: (r) => <FileLink file={r.invoiceFile} label="View" /> },
  ];
  if (isAdmin) {
    columns.push({
      key: 'actions', header: '', align: 'actions',
      render: (r) => (
        <>
          {r.status === 'requested' && <button type="button" className="btn btn-link" onClick={() => setDialog({ type: 'approve', row: r })}>Approve</button>}
          {r.status === 'requested' && <button type="button" className="btn btn-link" onClick={() => setDialog({ type: 'reject', row: r })}>Reject</button>}
          {r.status === 'approved' && <button type="button" className="btn btn-link" onClick={() => setDialog({ type: 'pay', row: r })}>Mark as paid</button>}
        </>
      ),
    });
  }

  const s = summary.data;
  return (
    <>
      <PageHeader title="Reimbursements" subtitle={isAdmin ? 'Expenses paid by staff and claimed back' : 'Your expense claims'}>
        <button type="button" className="btn btn-primary" onClick={() => setDialog({ type: 'new' })}>New reimbursement</button>
      </PageHeader>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <Alert tone="danger">{list.error}</Alert>
      {s && (
        <div className="stats">
          <div className="stat"><div className="label">Awaiting decision</div><div className="value">{formatMoney(s.requested.amount)}</div><div className="note">{s.requested.count} claim(s)</div></div>
          <div className="stat"><div className="label">Approved, not yet paid</div><div className="value">{formatMoney(s.approved.amount)}</div><div className="note">{s.approved.count} claim(s)</div></div>
          <div className="stat"><div className="label">Paid</div><div className="value">{formatMoney(s.paid.amount)}</div><div className="note">{s.paid.count} claim(s)</div></div>
        </div>
      )}
      <div className="toolbar">
        <input className="input" type="search" placeholder="Search description, vendor or bill" aria-label="Search reimbursements" value={filters.q} onChange={set('q')} />
        <select className="select" aria-label="Status" value={filters.status} onChange={set('status')}>
          <option value="">All statuses</option>
          {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {isAdmin && (
          <select className="select" aria-label="Claimant" value={filters.claimant} onChange={set('claimant')}>
            <option value="">All claimants</option>
            {(users.data || []).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        )}
        <input className="input" type="date" aria-label="From date" value={filters.from} onChange={set('from')} style={{ maxWidth: 150 }} />
        <input className="input" type="date" aria-label="To date" value={filters.to} onChange={set('to')} style={{ maxWidth: 150 }} />
      </div>
      <DataTable columns={columns} rows={list.data} loading={list.loading} emptyMessage="No reimbursements match these filters." />
      <Pagination meta={list.meta} onPage={setPage} />

      {dialog?.type === 'new' && <ClaimForm isAdmin={isAdmin} onCancel={() => setDialog(null)} onDone={refresh} />}
      {dialog?.type === 'pay' && <PayModal row={dialog.row} onCancel={() => setDialog(null)} onDone={refresh} />}
      {dialog?.type === 'approve' && (
        <ReasonModal title="Approve reimbursement" label="Paid by" hint="Optional. Who will reimburse this, as shown on the investor sheet" confirmLabel="Approve" onCancel={() => setDialog(null)}
          onSubmit={async (paidBy) => { await api.post(`/reimbursements/${dialog.row._id}/approve`, { paidBy }); refresh('Reimbursement approved.'); }} />
      )}
      {dialog?.type === 'reject' && (
        <ReasonModal title="Reject reimbursement" label="Reason" hint="Shown to the person who made the claim" confirmLabel="Reject" danger onCancel={() => setDialog(null)}
          onSubmit={async (reason) => { await api.post(`/reimbursements/${dialog.row._id}/reject`, { reason }); refresh('Reimbursement rejected.'); }} />
      )}
    </>
  );
}
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
