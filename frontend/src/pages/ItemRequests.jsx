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
    }
  };

  return (
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
