import { useEffect, useState } from 'react';
import api, { errorMessage, fieldErrors } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import PageHeader from './PageHeader';
import DataTable from './DataTable';
import Pagination from './Pagination';
import Alert from './Alert';
import Badge from './Badge';
import Modal from './Modal';
import Field from './Field';
import ConfirmDialog from './ConfirmDialog';

/*
 * A list page with search, add, edit and deactivate for resources that are just a few fields
 * (item types, vehicles, users). fields: [{ key, label, type, required, hint, options, createOnly, full }]
 */
function RecordForm({ config, record, onSaved, onCancel }) {
  const editing = Boolean(record?._id);
  const fields = config.fields.filter((f) => !(editing && f.createOnly));
  const initial = Object.fromEntries(fields.map((f) => [f.key, record?.[f.key] ?? (f.type === 'checkbox' ? (f.default ?? false) : f.default ?? '')]));
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const missing = Object.fromEntries(fields.filter((f) => f.required && !String(form[f.key]).trim()).map((f) => [f.key, `${f.label} is required`]));
    setErrors(missing);
    if (Object.keys(missing).length) return;
    const payload = Object.fromEntries(fields.map((f) => [f.key, f.type === 'number' ? Number(form[f.key] || 0) : form[f.key]]));
    setBusy(true);
    setFormError('');
    try {
      if (editing) await api.put(`${config.endpoint}/${record._id}`, payload);
      else await api.post(config.endpoint, payload);
      onSaved(editing ? `${config.noun} updated.` : `${config.noun} added.`);
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`${editing ? 'Edit' : 'Add'} ${config.noun.toLowerCase()}`}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" form="record-form" className="btn btn-primary" disabled={busy}>Save</button>
        </>
      }
    >
      <Alert tone="danger">{formError}</Alert>
      <form id="record-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          {fields.map((f) =>
            f.type === 'checkbox' ? (
              <label key={f.key} className="check full">
                <input type="checkbox" checked={Boolean(form[f.key])} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
                <span>{f.label}{f.hint && <span className="field-hint"> {f.hint}</span>}</span>
              </label>
            ) : (
              <Field key={f.key} label={f.label} required={f.required} hint={f.hint} error={errors[f.key]} className={f.full ? 'full' : ''}>
                {f.type === 'select' ? (
                  <select className="select" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input
                    className="input" type={f.type || 'text'} value={form[f.key]} min={f.type === 'number' ? 0 : undefined} step={f.type === 'number' ? 'any' : undefined}
                    autoComplete={f.type === 'password' ? 'new-password' : undefined}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} aria-invalid={Boolean(errors[f.key])}
                  />
                )}
              </Field>
            )
          )}
        </div>
      </form>
    </Modal>
  );
}

export default function SimpleCrudPage({ config }) {
  const { isAdmin } = useAuth();
  const canWrite = config.canWrite ?? isAdmin;
  const [q, setQ] = useState('');
  const search = useDebounce(q);
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const { data, meta, loading, error, reload } = useFetch(config.endpoint, { q: search || undefined, status, page, limit: 20 });
  useEffect(() => setPage(1), [search, status]);

  const changeStatus = async () => {
    const { row, action } = confirm;
    setBusy(true);
    try {
      if (action === 'deactivate') await api.delete(`${config.endpoint}/${row._id}`);
      else await api.post(`${config.endpoint}/${row._id}/reactivate`);
      setNotice({ tone: 'success', text: `${config.noun} ${action === 'deactivate' ? 'deactivated' : 'reactivated'}.` });
      reload();
    } catch (err) {
      setNotice({ tone: 'danger', text: errorMessage(err) });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const columns = [
    ...config.columns,
    { key: 'isActive', header: 'Status', render: (r) => <Badge status={r.isActive === false ? 'inactive' : 'active'}>{r.isActive === false ? 'Inactive' : 'Active'}</Badge> },
  ];
  if (canWrite) {
    columns.push({
      key: 'actions', header: '', align: 'actions',
      render: (r) => (
        <>
          {config.extraActions?.(r, { reload, setNotice })}
          <button type="button" className="btn btn-link" onClick={() => setEditing(r)}>Edit</button>
          {r.isActive === false
            ? <button type="button" className="btn btn-link" onClick={() => setConfirm({ row: r, action: 'reactivate' })}>Reactivate</button>
            : <button type="button" className="btn btn-link" onClick={() => setConfirm({ row: r, action: 'deactivate' })}>Deactivate</button>}
        </>
      ),
    });
  }

  return (
    <>
      <PageHeader title={config.title} subtitle={config.subtitle}>
        {canWrite && <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>Add {config.noun.toLowerCase()}</button>}
      </PageHeader>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <Alert tone="danger">{error}</Alert>
      <div className="toolbar">
        <input className="input" type="search" placeholder={config.searchPlaceholder || 'Search'} aria-label={`Search ${config.title.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />
        {canWrite && (
          <select className="select" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        )}
      </div>
      <DataTable columns={columns} rows={data} loading={loading} emptyMessage={search ? `No ${config.title.toLowerCase()} match your search.` : `No ${config.title.toLowerCase()} have been added yet.`} />
      <Pagination meta={meta} onPage={setPage} />
      {editing && <RecordForm config={config} record={editing} onSaved={(m) => { setEditing(null); setNotice({ tone: 'success', text: m }); reload(); }} onCancel={() => setEditing(null)} />}
      {confirm && (
        <ConfirmDialog
          title={`${confirm.action === 'deactivate' ? 'Deactivate' : 'Reactivate'} ${config.noun.toLowerCase()}`}
          message={confirm.action === 'deactivate' ? `This ${config.noun.toLowerCase()} will no longer appear in lists or forms. Existing records that refer to it are kept.` : `This ${config.noun.toLowerCase()} will be available again.`}
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
