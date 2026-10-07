import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import useFetch from '../hooks/useFetch';
import useFilters from '../hooks/useFilters';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Field from '../components/Field';
import { formatDate, formatQty } from '../utils/format';

function AdjustModal({ item, onDone, onCancel }) {
  const [form, setForm] = useState({ direction: 'out', quantity: '', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(form.quantity) > 0)) return setError('Enter a quantity greater than zero');
    if (!form.reason.trim()) return setError('A reason is required for every adjustment');
    setBusy(true);
    setError('');
    try {
      await api.post('/inventory/adjustments', { itemType: item._id, direction: form.direction, quantity: Number(form.quantity), reason: form.reason });
      onDone(`Stock for ${item.name} adjusted.`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Adjust stock: ${item.name}`} onClose={onCancel}
      footer={<><button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" form="adjust-form" className="btn btn-primary" disabled={busy}>Record adjustment</button></>}
    >
      <Alert tone="danger">{error}</Alert>
      <p className="muted" style={{ marginBottom: 14 }}>Currently in stock: {formatQty(item.balance)} {item.unit}. Adjustments are added to the ledger and cannot be edited later.</p>
      <form id="adjust-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Adjustment">
            <select className="select" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              <option value="out">Remove from stock</option>
              <option value="in">Add to stock</option>
            </select>
          </Field>
          <Field label={`Quantity (${item.unit})`} required>
            <input className="input" type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} autoFocus />
          </Field>
          <Field label="Reason" required className="full" hint="For example: damaged in storage, stock count correction, opening stock">
            <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

export default function Stock() {
  const { filters, set, page, setPage, params } = useFilters({ q: '', lowStock: false, sort: 'name' });
  const { data, meta, loading, error, reload } = useFetch('/inventory', { ...params, limit: 25 });
  const [adjusting, setAdjusting] = useState(null);
  const [notice, setNotice] = useState(null);

  const columns = [
    { key: 'name', header: 'Item' },
    { key: 'balance', header: 'In stock', align: 'num', render: (r) => `${formatQty(r.balance)} ${r.unit || ''}` },
    { key: 'reorderLevel', header: 'Reorder level', align: 'num', render: (r) => (r.reorderLevel > 0 ? formatQty(r.reorderLevel) : '-') },
    { key: 'status', header: 'Status', render: (r) => (r.lowStock ? <Badge tone="danger">Low stock</Badge> : <span className="muted">OK</span>) },
    { key: 'lastMovement', header: 'Last movement', render: (r) => formatDate(r.lastMovement) },
    {
      key: 'actions', header: '', align: 'actions',
      render: (r) => (
        <>
          <Link to={`/ledger?itemType=${r._id}`}>History</Link>
          <button type="button" className="btn btn-link" onClick={() => setAdjusting(r)}>Adjust</button>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Stock" subtitle="Quantities on hand, calculated from the stock ledger" />
      {notice && <Alert tone="success">{notice}</Alert>}
      <Alert tone="danger">{error}</Alert>
      {meta?.lowStockCount > 0 && <Alert tone="info">{meta.lowStockCount} item(s) are at or below their reorder level.</Alert>}
      <div className="toolbar">
        <input className="input" type="search" placeholder="Search items" aria-label="Search items" value={filters.q} onChange={set('q')} />
        <select className="select" aria-label="Sort by" value={filters.sort} onChange={set('sort')}>
          <option value="name">Sort by name</option>
          <option value="balance">Sort by quantity (lowest first)</option>
        </select>
        <label className="check"><input type="checkbox" checked={filters.lowStock} onChange={set('lowStock')} /><span>Low stock only</span></label>
      </div>
      <DataTable columns={columns} rows={data} loading={loading} emptyMessage={filters.lowStock ? 'No items are below their reorder level.' : 'No stock items found. Items appear here after a purchase is received.'} />
      <Pagination meta={meta} onPage={setPage} />
      {adjusting && <AdjustModal item={adjusting} onCancel={() => setAdjusting(null)} onDone={(m) => { setAdjusting(null); setNotice(m); reload(); }} />}
    </>
  );
}
