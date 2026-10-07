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
    }
  };

  return (
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
