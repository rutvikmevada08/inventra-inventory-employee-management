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
