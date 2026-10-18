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
    }
  };

  return (
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
